export type DestinationPhoto={url:string;source:string;title:string;author:string;license:string};
export type Trip={city?:{id:number;name:string;country:string;region:string;latitude:number;longitude:number};destination:string;additionalDestinations?:string[];origin:string;start:string;end:string;travelers:number;budget:number;pace:string;transport:string;notes:string;links:string;adjustment:string;sources:string[]};
export type Activity={completed?:boolean;endTime?:string;source?:string;id:string;title:string;description:string;time?:string;duration?:string;location?:string;price?:string;estimatedCostEUR?:number;costCategory?:'Actividades'|'Transporte'|'Comida';costNote?:string;reservation?:string};
export type Day={id:string;title:string;activities:Activity[]};
export type Expense={id:string;date:string;label:string;category:string;amount:number;currency?:string;originalAmount?:number;rate?:number;linkedActivityId?:string};
export type Plan={photos?:DestinationPhoto[];photoKey?:string;id:string;trip:Trip;kind:'draft'|'researched';createdAt:string;itinerary?:Day[];expenses?:Expense[];parts?:{text:string;annotations:{start:number;end:number;url:string;title:string}[]}[];sources?:{url:string;title:string}[]};
export const money=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
export const spent=(p:Plan)=>(p.expenses||[]).reduce((n,e)=>n+Math.round(e.amount*100),0)/100;
export const outsideBudget=(e:Expense)=>['Vuelos','Aéreo','Aéreos','Alojamiento','Hospedaje'].includes(e.category);
export const budgetSpent=(p:Plan)=>(p.expenses||[]).filter(e=>!outsideBudget(e)).reduce((n,e)=>n+Math.round(e.amount*100),0)/100;
export const extraSpent=(p:Plan)=>(p.expenses||[]).filter(outsideBudget).reduce((n,e)=>n+Math.round(e.amount*100),0)/100;
export function status(p:Plan,today=new Date().toLocaleDateString('sv-SE')){return !p.trip.start||!p.trip.end?'Sin fechas':p.trip.start>today?'Próximo':p.trip.end<today?'Finalizado':'En curso'}
export const photo=(s:string)=>/par[ií]s/i.test(s)?'/demo/paris.jpg':/colmar/i.test(s)?'/demo/colmar.jpg':/barcelona/i.test(s)?'/demo/barcelona.jpg':/roma/i.test(s)?'/demo/roma.jpg':/lisboa/i.test(s)?'/demo/lisboa.jpg':null;
export function daysCount(t:Trip){const n=(Date.parse(t.end)-Date.parse(t.start))/86400000+1;return Number.isFinite(n)&&n>0?Math.min(366,n):0}
export function dateLabel(date:string){return date?new Date(date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'Por definir'}
export const safeURL=(s:string)=>{try{return ['https:','http:'].includes(new URL(s).protocol)}catch{return false}};
export function itineraryOf(p:Plan):Day[]{
 if(p.itinerary)return p.itinerary;
 const days:Day[]=[]; let current:Day|null=null;
 for(const part of p.parts||[]){
  for(const raw of part.text.split('\n')){
   const line=raw.replace(/^[#*\s]+/,'').replace(/\*+/g,'').trim();
   const match=line.match(/^D[ií]a\s+(\d+)\b(.*)/i);
   if(match){current={id:'day-'+match[1],title:match[2].replace(/^\s*[:—–-]\s*/,'')||'A tu ritmo',activities:[]};days.push(current);continue}
   if(/^(Presupuesto|Ideas de viajeros|Antes de reservar|Cobertura de fuentes|Cómo llegar|Dónde alojarse|Resumen del viaje)/i.test(line)){current=null;continue}
   if(current&&line){for(const [i,text] of line.split('|').entries()){
    const clean=text.replace(/^[-•]\s*/,'').trim();if(!clean)continue;
    const colon=clean.indexOf(': ');current.activities.push({id:current.id+'-'+current.activities.length+'-'+i,title:colon>0&&colon<90?clean.slice(0,colon):clean.length<90?clean:'Propuesta del día',description:colon>0&&colon<90?clean.slice(colon+2):clean.length<90?'':clean});
   }}
  }
 }
 const count=Math.max(daysCount(p.trip),days.length);
 if(!days.length)for(let i=0;i<Math.max(1,count);i++)days.push({id:'day-'+(i+1),title:'Tu día por diseñar',activities:[]});
 while(days.length<count)days.push({id:'day-'+(days.length+1),title:'Tu día por diseñar',activities:[]});
 return days;
}
export function duplicate(p:Plan):Plan{return {...structuredClone(p),id:newId(),createdAt:new Date().toISOString(),trip:{...p.trip,destination:p.trip.destination+' · copia'},expenses:[]}}
export function backup(p:Plan){const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='viaja-viaje.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export function newId(){return globalThis.crypto?.randomUUID?.()||'local-'+Date.now().toString(36)+'-'+Array.from(globalThis.crypto.getRandomValues(new Uint32Array(3))).map(n=>n.toString(36)).join('')}
