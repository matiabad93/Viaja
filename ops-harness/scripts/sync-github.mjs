// One-time or manually requested historical import; NEVER sends old WhatsApps.
const repository='matiabad93/Viaja';
function shapeIssue(x){
 return {task_id:'github:'+repository+':issue:'+x.number,project:repository,title:String(x.title||'Issue #'+x.number).slice(0,180),
  summary:'Issue #'+x.number+' registrada en GitHub. Consultá el enlace para conocer el estado y las evidencias.',
  url:x.html_url,source:'github_issue',actor:'matiabad93',state:x.state==='closed'?'completed':'todo',silent:true};
}
function shapePR(x){
 return {task_id:'github:'+repository+':pr:'+x.number,project:repository,title:String('PR #'+x.number+' — '+(x.title||'Cambio de código')).slice(0,180),
  summary:'PR #'+x.number+' registrada en GitHub. Que un PR esté fusionado no confirma un despliegue.',
  url:x.html_url,source:'github_pr',actor:'matiabad93',
  state:x.merged_at?'completed':x.state==='closed'?'cancelled':'in_progress',silent:true};
}
const githubToken=process.env.GH_OPS_READ_TOKEN;
const url=process.env.OPS_INGEST_URL;
const token=process.env.OPS_INGEST_TOKEN;
if(!url||!token||!githubToken)throw Error('Falta GH_OPS_READ_TOKEN, OPS_INGEST_URL u OPS_INGEST_TOKEN');
async function getGithub(path){
 const r=await fetch('https://api.github.com/repos/'+repository+path,{headers:{
  Authorization:'Bearer '+githubToken,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Viaja-Ops-Harness'
 }});
 if(!r.ok)throw Error('GitHub respondió HTTP '+r.status);
 return r.json();
}
async function list(endpoint){
 const all=[];
 for(let page=1;page<=4;page++){
  const batch=await getGithub(endpoint+(endpoint.includes('?')?'&':'?')+'per_page=100&page='+page);
  if(!Array.isArray(batch))throw Error('Unexpected GitHub response');
  all.push(...batch);if(batch.length<100)break;
 }
 return all;
}
async function ingest(task){
 const response=await fetch(url.replace(/\/+$/,'')+'/api/events',{method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(task)});
 if(!response.ok)throw Error('Hub ingest failed HTTP '+response.status+' for '+task.task_id);
}
const issues=(await list('/issues?state=all')).filter(x=>!x.pull_request);
const prs=await list('/pulls?state=all');
for(const task of [...issues.map(shapeIssue),...prs.map(shapePR)])await ingest(task);
console.log('Importación histórica sin WhatsApp: '+issues.length+' issues y '+prs.length+' PRs.');
