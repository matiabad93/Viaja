import {readFile} from 'node:fs/promises';

const truncate=(value,limit)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,limit);
export function taskFromGitHub({name,event,repository,actor}){
 const project=repository||'matiabad93/Viaja';
 if(project!=='matiabad93/Viaja')return null;
 if(actor!=='matiabad93')return null; // nobody else can trigger WhatsApp.
 if(name==='issues'){
  const issue=event.issue;
  if(!issue?.number||!['opened','edited','reopened','closed'].includes(event.action))return null;
  return {
   task_id:'github:'+project+':issue:'+issue.number,project,actor,source:'github_issue',
   title:truncate(issue.title||'Issue #'+issue.number,180),
   summary:issue.state==='closed'?'Issue #'+issue.number+' cerrada en GitHub. Revisá el detalle: cerrar un issue no verifica automáticamente el despliegue.':truncate(issue.body,650)||'Tarea registrada en el backlog de Viaja.',
   url:issue.html_url,
   state:event.action==='closed'?'completed':event.action==='reopened'?'in_progress':'todo'
  };
 }
 if(name==='pull_request_target'){
  const pr=event.pull_request;
  if(!pr?.number||!['opened','reopened','closed','ready_for_review'].includes(event.action))return null;
  const merged=event.action==='closed'&&pr.merged===true;
  return {
   task_id:'github:'+project+':pr:'+pr.number,project,actor,source:'github_pr',
   title:truncate('PR #'+pr.number+' — '+(pr.title||'Cambios de código'),180),
   summary:merged?'Pull request integrado en main. El despliegue en Cloudflare es una comprobación aparte.':
    event.action==='closed'?'PR cerrado sin integrar.':'Propuesta de implementación en revisión; no está publicada en producción.',
   url:pr.html_url,
   state:merged?'completed':event.action==='closed'?'cancelled':'in_progress'
  };
 }
 if(name==='workflow_dispatch'){
  const values=event.inputs||{};
  const state=['todo','in_progress','blocked','completed','cancelled'].includes(values.state)?values.state:'completed';
  return {
   task_id:'github:'+project+':manual:'+truncate(values.task_id||event.repository?.id||'ops-manual',90),
   project,actor,source:'manual',
   title:truncate(values.title,180),
   summary:truncate(values.summary,900),
   url:truncate(values.url||'https://github.com/matiabad93/Viaja/issues',480),
   state
  };
 }
 return null;
}
export async function sendTask(task,{url,token,fetcher=fetch}){
 if(!/^https:\/\//.test(url||''))throw Error('OPS_INGEST_URL debe ser HTTPS');
 if(!token||token.length<24)throw Error('Falta configurar OPS_INGEST_TOKEN');
 const r=await fetcher(url.replace(/\/+$/,'')+'/api/events',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify(task)
 });
 if(!r.ok)throw Error('Ingesta de tareas devolvió HTTP '+r.status);
 return r.json();
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const env=process.env;
 const contents=JSON.parse(await readFile(env.GITHUB_EVENT_PATH,'utf8'));
 const task=taskFromGitHub({name:env.GITHUB_EVENT_NAME,event:contents,
  repository:env.GITHUB_REPOSITORY,actor:env.GITHUB_ACTOR});
 if(!task){console.log('Evento ignorado: no es una tarea autorizada.');process.exit(0)}
 if(!env.OPS_INGEST_URL||!env.OPS_INGEST_TOKEN){
  console.log('Harness todavía no configurado: no se envían mensajes de WhatsApp.');process.exit(0);
 }
 const data=await sendTask(task,{url:env.OPS_INGEST_URL,token:env.OPS_INGEST_TOKEN});
 console.log('Tarea registrada en Viaja Ops: '+task.task_id+' ('+task.state+') — notificación '+(data.notify_enabled?'habilitada':'deshabilitada'));
}
