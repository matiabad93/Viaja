// Official WhatsApp Cloud API adapter; never automates consumer WhatsApp Web.
const normalizeNumber=value=>String(value||'').replace(/\D/g,'');
export function isValidRecipient(value){return /^[1-9][0-9]{7,14}$/.test(normalizeNumber(value))}
const graphVersion=env=>/^v[0-9]+\.[0-9]+$/.test(env.WA_GRAPH_VERSION||'')?env.WA_GRAPH_VERSION:'v23.0';
const endpoint=(env,path)=>'https://graph.facebook.com/'+graphVersion(env)+'/'+encodeURIComponent(env.WA_PHONE_NUMBER_ID)+path;
function config(env){
 if(!env.WA_ACCESS_TOKEN||!env.WA_PHONE_NUMBER_ID||!isValidRecipient(env.WA_RECIPIENT))throw Error('Faltan credenciales de WhatsApp del sistema de tareas');
 return normalizeNumber(env.WA_RECIPIENT);
}
async function graph(env,path,payload){
 const res=await fetch(endpoint(env,path),{method:'POST',headers:{Authorization:'Bearer '+env.WA_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 let json={};try{json=await res.json()}catch{}
 if(!res.ok)throw Error('WhatsApp HTTP '+res.status+' / código '+String(json.error?.code||'sin detalle'));
 return json;
}
export function completionTemplate(task,env){
 return {messaging_product:'whatsapp',to:normalizeNumber(env.WA_RECIPIENT),type:'template',
  template:{name:env.WA_TEMPLATE_NAME||'viaja_task_completed',language:{code:env.WA_TEMPLATE_LANG||'es'},
   components:[{type:'body',parameters:[
    {type:'text',text:task.title.slice(0,150)},
    {type:'text',text:task.url.slice(0,400)}
   ]}]}
 };
}
export async function sendCompletionTemplate(task,env){
 config(env);
 return graph(env,'/messages',completionTemplate(task,env));
}
export async function sendSessionText(text,env){
 config(env);
 return graph(env,'/messages',{messaging_product:'whatsapp',to:normalizeNumber(env.WA_RECIPIENT),type:'text',text:{preview_url:false,body:String(text).slice(0,3500)}});
}
export function narratedSummary(task){
 // Only task metadata is narrated; never include tokens, email addresses,
 // environment variables, private file bodies or raw GitHub event JSON.
 return ('Este es un audio generado por inteligencia artificial con el resumen de Viaja Ops. '+
  'La tarea '+task.title+'. Estado: terminada. '+task.summary+
  ' Podés abrir el detalle en el enlace que te llegó por WhatsApp.').slice(0,1500);
}
export async function synthesizeSummaryAudio(task,env){
 if(!env.OPENAI_API_KEY)throw Error('Falta configurar el proveedor de voz');
 const res=await fetch('https://api.openai.com/v1/audio/speech',{
  method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({model:env.OPS_TTS_MODEL||'gpt-4o-mini-tts',voice:env.OPS_TTS_VOICE||'marin',
   input:narratedSummary(task),
   instructions:'Narrá en español rioplatense, voz clara y cálida, tono profesional, ritmo tranquilo. No agregues información.',
   response_format:'opus'})
 });
 if(!res.ok)throw Error('El proveedor de voz no pudo generar el audio (HTTP '+res.status+')');
 const data=new Uint8Array(await res.arrayBuffer());
 // WhatsApp voice messages require OGG with Opus codec. Fail closed if the
 // configured speech model responds with another container.
 if(data.length<200||new TextDecoder().decode(data.slice(0,4))!=='OggS')throw Error('El audio no llegó como OGG/Opus compatible con WhatsApp');
 if(data.length>14*1024*1024)throw Error('El audio supera el límite seguro configurado');
 return data;
}
export async function sendSessionAudio(task,env){
 config(env);
 const bytes=await synthesizeSummaryAudio(task,env);
 const form=new FormData();
 form.append('messaging_product','whatsapp');
 form.append('type','audio/ogg');
 form.append('file',new Blob([bytes],{type:'audio/ogg'}),'viaja-resumen.ogg');
 const upload=await fetch(endpoint(env,'/media'),{method:'POST',headers:{Authorization:'Bearer '+env.WA_ACCESS_TOKEN},body:form});
 let media={};try{media=await upload.json()}catch{}
 if(!upload.ok||!media.id)throw Error('WhatsApp rechazó el audio (HTTP '+upload.status+')');
 return graph(env,'/messages',{messaging_product:'whatsapp',to:normalizeNumber(env.WA_RECIPIENT),type:'audio',audio:{id:media.id,voice:true}});
}
export function authorizedSender(sender,env){
 return isValidRecipient(sender)&&normalizeNumber(sender)===normalizeNumber(env.WA_RECIPIENT);
}
