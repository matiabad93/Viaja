export function validateItinerary(raw:unknown,start:string,count:number){
 if(!Array.isArray(raw)||raw.length!==count)throw Error('El itinerario no contiene todos los días solicitados.');
 const seen=new Set<string>();
 return raw.map((d:any,i:number)=>{
 const date=new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10);
 if(d.date!==date||!Array.isArray(d.activities)||d.activities.length>12)throw Error('Fecha o actividades inválidas.');
 const activities=d.activities.map((a:any)=>{
 if(typeof a.title!=='string'||!a.title.trim()||typeof a.description!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)||!Number.isInteger(a.minutes)||a.minutes<15||a.minutes>720)throw Error('Actividad sin nombre, horario o duración válida.');
 const key=a.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();if(seen.has(key))throw Error('Actividad duplicada.');seen.add(key);
 const u=new URL(a.source);if(u.protocol!=='https:')throw Error('Fuente inválida.');
 const n=Number(a.time.slice(0,2))*60+Number(a.time.slice(3))+a.minutes;if(n>=1440)throw Error('La actividad excede el día.');
 return {id:crypto.randomUUID(),title:a.title,description:a.description,time:a.time,duration:a.minutes+' min',endTime:String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'),source:a.source,location:typeof a.location==='string'?a.location:'',scheduleStatus:'estimated'};
 });
 if(!activities.length&&!d.limitation)throw Error('Día vacío sin explicación.');
 return {id:crypto.randomUUID(),title:d.limitation||date,activities};
 });
}
