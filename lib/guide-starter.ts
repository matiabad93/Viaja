import type {Day,Trip,Activity} from './travel.ts';
import {daysCount,newId} from './travel.ts';
import {initial,extra} from './curated-guides.ts';

/** Make a useful local starting point before an AI account exists.
 * Content is copied from Viaja's existing editorial guides, not generated or
 * presented as current prices, opening times or confirmed reservations.
 */
export function createEditorialStarter(trip:Trip):Day[]|null{
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const city=normalize(trip.destination);
 const guides=[...extra,...initial];
 const names:Record<string,string>={paris:'paris',roma:'roma',colmar:'colmar',barcelona:'barcelona',lisboa:'lisboa',madrid:'madrid'};
 const match=Object.entries(names).find(([name])=>city.includes(name));
 const guide=match?guides.find(g=>g.id===match[1]):undefined;
 if(!guide)return null;
 const count=daysCount(trip)||trip.preferences?.durationDays||3;
 if(!Number.isInteger(count)||count<1||count>31)return null;
 return Array.from({length:count},(_,i)=>{
  const raw=guide.days[i];
  if(!raw)return {id:newId(),title:'Día '+(i+1)+' · A tu ritmo',activities:[]} as Day;
  const segments=raw.includes('|')
   ?raw.split('|').map(s=>s.trim()).filter(Boolean)
   :raw.split(/(?=\b(?:Mañana|Tarde|Noche):)/).map(s=>s.trim()).filter(Boolean);
  const activities:Activity[]=segments.map(segment=>{
   const colon=segment.indexOf(':');
   if(colon>=0&&colon<95){
    const left=segment.slice(0,colon).trim();
    const description=segment.slice(colon+1).trim();
    return {id:newId(),title:['Mañana','Tarde','Noche'].includes(left)?left+' en '+guide.title:left,
     description,location:['Mañana','Tarde','Noche'].includes(left)?guide.title:left};
   }
   return {id:newId(),title:segment.slice(0,90),description:segment.slice(90),location:guide.title};
  });
  return {id:newId(),title:'Día '+(i+1)+' · '+guide.title,activities,
   advice:'Ideas de la guía editorial de Viaja. Verificá horarios, conexiones y entradas antes de reservar.'} as Day;
 });
}
