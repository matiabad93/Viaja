import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validateTask,verifyMetaSignature,safeCompare} from '../src/index.mjs';
import {completionTemplate,authorizedSender,narratedSummary,isValidRecipient} from '../src/whatsapp.mjs';
import {taskFromGitHub,sendTask} from '../scripts/publish-github.mjs';

const task={
 task_id:'github:matiabad93/Viaja:issue:42',project:'matiabad93/Viaja',
 title:'Seguridad de PDFs verificada',summary:'Se aprobaron las pruebas de seguridad; ver enlace para evidencias.',
 state:'completed',source:'github_issue',actor:'matiabad93',url:'https://github.com/matiabad93/Viaja/issues/42'
};
const env={OPS_ADMIN_TOKEN:'A'.repeat(32),OPS_INGEST_TOKEN:'B'.repeat(32),WA_PHONE_NUMBER_ID:'123456789',WA_RECIPIENT:'34600000000',
 WA_TEMPLATE_NAME:'viaja_task_completed',WA_TEMPLATE_LANG:'es',WA_ACCESS_TOKEN:'fake-do-not-send',META_APP_SECRET:'fixture-test-only'};
const ctx={waitUntil(p){void p.catch(()=>{})}};
test('Task payload rejects unsafe links, malformed IDs and unknown state',()=>{
 assert.equal(validateTask(task).state,'completed');
 assert.equal(validateTask({...task,silent:true}).silent,true);
 assert.throws(()=>validateTask({...task,url:'javascript:alert(1)'}));
 assert.throws(()=>validateTask({...task,url:'https://evil.example/redirect'}));
 assert.throws(()=>validateTask({...task,state:'approved'}));
 assert.throws(()=>validateTask({...task,task_id:'~bad'}));
});
test('No unauthenticated access to task details or ingestion',async()=>{
 const r=await worker.fetch(new Request('https://harness.test/api/tasks'),env,ctx);
 assert.equal(r.status,401);
 const created=await worker.fetch(new Request('https://harness.test/api/events',{method:'POST',body:JSON.stringify(task)}),env,ctx);
 assert.equal(created.status,401);
 const healthy=await worker.fetch(new Request('https://harness.test/health'),env,ctx);
 assert.equal(healthy.status,200);
 const page=await worker.fetch(new Request('https://harness.test/'),env,ctx);
 assert.equal(page.status,200);
 assert.match(page.headers.get('content-security-policy'),/script-src 'nonce-/);
 assert.doesNotMatch(await page.text(),/B{30,}/);
});
test('Webhook verification requires exact challenge and signed payload',async()=>{
 const challenge=await worker.fetch(new Request('https://harness.test/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=right&hub.challenge=123'),
  {...env,WA_VERIFY_TOKEN:'right'},ctx);
 assert.equal(challenge.status,200);
 assert.equal(await challenge.text(),'123');
 const denied=await worker.fetch(new Request('https://harness.test/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123'),
  {...env,WA_VERIFY_TOKEN:'right'},ctx);
 assert.equal(denied.status,403);
 const payload=JSON.stringify({object:'whatsapp_business_account',entry:[]});
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.META_APP_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));
 const signature='sha256='+Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');
 assert.equal(await verifyMetaSignature(payload,signature,env.META_APP_SECRET),true);
 assert.equal(await verifyMetaSignature(payload,signature.slice(0,-1)+(signature.endsWith('0')?'1':'0'),env.META_APP_SECRET),false);
 const ok=await worker.fetch(new Request('https://harness.test/webhook/whatsapp',{method:'POST',
  headers:{'x-hub-signature-256':signature},body:payload}),env,ctx);
 assert.equal(ok.status,200);
});
test('WhatsApp template and narration use opt-in recipient, not private credentials',()=>{
 const template=completionTemplate(task,env);
 assert.equal(template.type,'template');
 assert.equal(template.to,'34600000000');
 assert.equal(template.template.components[0].parameters[0].text,task.title);
 assert.equal(template.template.components[0].parameters[1].text,task.url);
 assert.equal(authorizedSender('34600000000',env),true);
 assert.equal(authorizedSender('34000000000',env),false);
 assert.equal(isValidRecipient('00'),false);
 assert.match(narratedSummary(task),/generado por inteligencia artificial/);
 assert.doesNotMatch(narratedSummary(task),/fake-do-not-send/);
});
test('Owner-only GitHub events are distinct from production deployment confirmation',()=>{
 const evt={action:'closed',pull_request:{number:44,title:'Rediseño de Viaja',merged:true,html_url:'https://github.com/matiabad93/Viaja/pull/44'}};
 const t=taskFromGitHub({name:'pull_request_target',event:evt,repository:'matiabad93/Viaja',actor:'matiabad93'});
 assert.equal(t.state,'completed');
 assert.match(t.summary,/despliegue en Cloudflare es una comprobación aparte/);
 assert.equal(taskFromGitHub({name:'pull_request_target',event:evt,repository:'matiabad93/Viaja',actor:'attacker'}),null);
 const closed=taskFromGitHub({name:'issues',repository:'matiabad93/Viaja',actor:'matiabad93',
  event:{action:'closed',issue:{number:42,title:'Prueba',body:'OK',state:'closed',html_url:task.url}}});
 assert.equal(closed.state,'completed');
 const open=taskFromGitHub({name:'issues',repository:'matiabad93/Viaja',actor:'matiabad93',
  event:{action:'opened',issue:{number:42,title:'Prueba',body:'Por hacer',state:'open',html_url:task.url}}});
 assert.equal(open.state,'todo');
});
test('Ingestion never falls back to an unauthenticated endpoint',async()=>{
 let called=0;
 await assert.rejects(()=>sendTask(task,{url:'http://example.com',token:'B'.repeat(32),fetcher:async()=>{called++}}),/HTTPS/);
 await assert.rejects(()=>sendTask(task,{url:'https://harness.test',token:'short',fetcher:async()=>{called++}}),/OPS_INGEST_TOKEN/);
 assert.equal(called,0);
 const result=await sendTask(task,{url:'https://harness.test',token:'B'.repeat(32),fetcher:async(url,init)=>{
  called++;
  assert.equal(new URL(url).pathname,'/api/events');
  assert.match(init.headers.Authorization,/^Bearer /);
  return {ok:true,json:async()=>({stored:true})};
 }});
 assert.equal(result.stored,true);
 assert.equal(called,1);
});
test('Admin CSP excludes arbitrary 3rd party scripts and task cards use safe DOM',async()=>{
 const result=await worker.fetch(new Request('https://harness.test/'),env,ctx);
 const page=await result.text();
 assert.match(page,/textContent/);
 assert.match(result.headers.get('content-security-policy'),/script-src 'nonce-/i);
 assert.doesNotMatch(result.headers.get('content-security-policy'),/unsafe-inline/);
 assert.doesNotMatch(page,/localStorage\.setItem/);
});
