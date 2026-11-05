import {renderPanel} from './panel.mjs';
import {sendCompletionTemplate,sendSessionAudio,sendSessionText,authorizedSender} from './whatsapp.mjs';

const states=new Set(['todo','in_progress','blocked','completed','cancelled']);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
const noStoreResponse=(data,status,extra={})=>new Response(data,{status,headers:{...headers,...extra}});
export const safeCompare=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string')return false;
 const aa=new TextEncoder().encode(a),bb=new TextEncoder().encode(b);
 if(aa.byteLength!==bb.byteLength)return false;
 let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
 return diff===0;
};
const bearer=(request,expected)=>Boolean(expected&&expected.length>=24&&safeCompare(request.headers.get('Authorization')||'','Bearer '+expected));
export function validateTask(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Evento inválido');
 const task_id=String(raw.task_id||'');
 const title=String(raw.title||'').trim();
 const summary=String(raw.summary||'').trim();
 const project=String(raw.project||'').trim();
 const source=String(raw.source||'').trim();
 const actor=String(raw.actor||'').trim();
 const state=raw.state;
 if(!/^[a-z0-9:_./#-]{6,180}$/i.test(task_id))throw Error('ID de tarea inválido');
 if(!title||title.length>180||summary.length>900||!project||project.length>100||!actor||actor.length>70||source.length>50)throw Error('Campos fuera de rango');
 if(!states.has(state))throw Error('Estado inválido');
 let url;try{url=new URL(String(raw.url))}catch{throw Error('URL inválida')}
 if(url.protocol!=='https:'||!['github.com','viaja.pages.dev'].includes(url.hostname)&&!url.hostname.endsWith('.viaja.pages.dev'))throw Error('Solo se admiten URLs de GitHub o Viaja');
 if(url.href.length>500)throw Error('URL demasiado larga');
 return {task_id,title,summary:summary||'Tarea actualizada. Consultá el detalle para verificar qué quedó terminado.',project,source,actor,state,url:url.href};
}
export async function verifyMetaSignature(raw,signature,appSecret){
 if(!appSecret||!signature?.startsWith('sha256='))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(appSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw));
 const expected='sha256='+Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');
 return safeCompare(signature,expected);
}
async function upsert(db,task){
 await db.prepare(`INSERT INTO ops_tasks
 (task_id,project,title,summary,url,state,source,actor,notice_state,changed_at)
 VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
 ON CONFLICT(task_id) DO UPDATE SET
 project=excluded.project,title=excluded.title,summary=excluded.summary,url=excluded.url,
 state=excluded.state,source=excluded.source,actor=excluded.actor,changed_at=datetime('now'),
 notice_state=CASE
   WHEN excluded.state='completed' AND ops_tasks.state!='completed' THEN 'pending'
   WHEN excluded.state!='completed' THEN 'not_due'
   ELSE ops_tasks.notice_state END`).bind(task.task_id,task.project,task.title,task.summary,task.url,task.state,task.source,task.actor,task.state==='completed'?'pending':'not_due').run();
}
async function notifyIfReady(env,taskId){
 if(env.OPS_SEND_ENABLED!=='true')return; // Opt-in is mandatory.
 const claimed=await env.DB.prepare(`UPDATE ops_tasks SET notice_state='sending',last_error=NULL
 WHERE task_id=? AND state='completed' AND notice_state='pending'
 RETURNING *`).bind(taskId).first();
 if(!claimed)return;
 try{
  const res=await sendCompletionTemplate(claimed,env);
  await env.DB.prepare(`UPDATE ops_tasks SET notice_state='sent',whatsapp_message_id=?,last_error=NULL
 WHERE task_id=?`).bind(String(res.messages?.[0]?.id||''),taskId).run();
 }catch(error){
  await env.DB.prepare(`UPDATE ops_tasks SET notice_state='failed',last_error=?
 WHERE task_id=?`).bind(String(error?.message||'Fallo de envío').slice(0,260),taskId).run();
 }
}
async function handleInbound(payload,env){
 const entries=Array.isArray(payload?.entry)?payload.entry:[];
 for(const entry of entries){
  for(const change of Array.isArray(entry.changes)?entry.changes:[]){
   const messages=Array.isArray(change.value?.messages)?change.value.messages:[];
   for(const msg of messages.slice(0,12)){
    if(msg.type!=='text'||msg.text?.body?.trim().toLowerCase()!=='audio'||!authorizedSender(msg.from,env))continue;
    if(typeof msg.id!=='string'||msg.id.length>160)continue;
    // Unique incoming message ID prevents replayed Meta webhooks sending duplicate audio.
    const result=await env.DB.prepare('INSERT OR IGNORE INTO ops_inbound(message_id,sender) VALUES(?,?)').bind(msg.id,msg.from).run();
    if(!result.meta?.changes)continue;
    const task=await env.DB.prepare(`SELECT * FROM ops_tasks WHERE state='completed' AND notice_state='sent'
 ORDER BY changed_at DESC LIMIT 1`).first();
    if(!task){await sendSessionText('Todavía no hay un informe de tarea terminada. Te avisaré cuando haya uno.',env);continue}
    try{await sendSessionAudio(task,env)}
    catch(error){
     await sendSessionText('No pude crear una nota de voz en este momento. '+task.title+'. '+task.summary.slice(0,800)+'\n'+task.url,env);
    }
   }
  }
 }
}
async function readJson(request,max=10000){
 const raw=await request.text();
 if(raw.length>max)throw Error('Solicitud demasiado extensa');
 return JSON.parse(raw);
}
export default {
 async fetch(request,env,ctx){
  try{
   const url=new URL(request.url);
   const method=request.method.toUpperCase();
   if(url.pathname==='/health'&&method==='GET')return json({ok:true,service:'viaja-ops-harness'});
   if(url.pathname==='/'&&method==='GET'){
    const nonce=crypto.randomUUID().replaceAll('-','');
    return noStoreResponse(renderPanel(nonce),200,{'Content-Type':'text/html; charset=utf-8',
     'Content-Security-Policy':`default-src 'none';script-src 'nonce-${nonce}';style-src 'nonce-${nonce}';connect-src 'self';base-uri 'none';form-action 'none';frame-ancestors 'none'`});
   }
   if(url.pathname==='/webhook/whatsapp'&&method==='GET'){
    const mode=url.searchParams.get('hub.mode'),token=url.searchParams.get('hub.verify_token'),challenge=url.searchParams.get('hub.challenge');
    if(mode==='subscribe'&&safeCompare(token,env.WA_VERIFY_TOKEN)&&typeof challenge==='string'&&/^\d{1,50}$/.test(challenge))
     return noStoreResponse(challenge,200,{'Content-Type':'text/plain; charset=utf-8'});
    return json({error:'Forbidden'},403);
   }
   if(url.pathname==='/webhook/whatsapp'&&method==='POST'){
    const raw=await request.text();
    if(raw.length>64000)return json({error:'Too large'},413);
    if(!await verifyMetaSignature(raw,request.headers.get('x-hub-signature-256'),env.META_APP_SECRET))return json({error:'Forbidden'},403);
    let data;try{data=JSON.parse(raw)}catch{return json({error:'Malformed JSON'},400)}
    ctx.waitUntil(handleInbound(data,env));
    return json({ok:true});
   }
   if(url.pathname==='/api/tasks'&&method==='GET'){
    if(!bearer(request,env.OPS_ADMIN_TOKEN))return json({error:'Unauthorized'},401);
    if(!env.DB)return json({error:'Database not connected'},503);
    const tasks=await env.DB.prepare(`SELECT task_id,project,title,summary,url,state,source,actor,changed_at,notice_state,last_error
 FROM ops_tasks ORDER BY changed_at DESC LIMIT 300`).all();
    return json({tasks:tasks.results||[]});
   }
   if(url.pathname==='/api/events'&&method==='POST'){
    if(!bearer(request,env.OPS_INGEST_TOKEN))return json({error:'Unauthorized'},401);
    if(!env.DB)return json({error:'Database not connected'},503);
    let task;try{task=validateTask(await readJson(request))}catch(e){return json({error:e.message||'Invalid task'},400)}
    await upsert(env.DB,task);
    if(task.state==='completed')ctx.waitUntil(notifyIfReady(env,task.task_id));
    return json({stored:true,task_id:task.task_id,notify_enabled:env.OPS_SEND_ENABLED==='true'},202);
   }
   if(url.pathname==='/api/notify/retry'&&method==='POST'){
    if(!bearer(request,env.OPS_ADMIN_TOKEN))return json({error:'Unauthorized'},401);
    if(!env.DB)return json({error:'Database not connected'},503);
    let raw;try{raw=await readJson(request,1024)}catch{return json({error:'Invalid body'},400)}
    if(!/^[a-z0-9:_./#-]{6,180}$/i.test(raw.task_id||''))return json({error:'Invalid task ID'},400);
    await env.DB.prepare(`UPDATE ops_tasks SET notice_state='pending' WHERE task_id=? AND state='completed'
 AND notice_state IN ('failed','not_due')`).bind(raw.task_id).run();
    ctx.waitUntil(notifyIfReady(env,raw.task_id));
    return json({queued:true},202);
   }
   return json({error:method==='OPTIONS'?'Method not allowed':'Not found'},method==='OPTIONS'?405:404);
  }catch(error){
   // Do not leak secrets, SQL details, webhook bodies or provider responses.
   return json({error:'Hubo un problema al procesar el evento del harness.'},500);
  }
 }
};
