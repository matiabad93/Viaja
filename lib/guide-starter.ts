import type {Day,Trip,Activity} from './travel.ts';
import {daysCount,newId} from './travel.ts';
import {initial,extra,type Guide} from './curated-guides.ts';

const canonicalDestinations:Record<string,string>={paris:'París, Francia',roma:'Roma, Italia',colmar:'Colmar, Francia',barcelona:'Barcelona, España',lisboa:'Lisboa, Portugal',madrid:'Madrid, España'};
export function guideDestination(guide:Guide){return canonicalDestinations[guide.id]||guide.title}

/** Both entry points use the same stops. No generic "morning in city" marker. */
export function createGuideItinerary(guide:Guide,count:number):Day[]{
 if(!Number.isInteger(count)||count<1||count>31)return [];
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
    const period=['Mañana','Tarde','Noche'].includes(left);
    return {id:newId(),title:period?left+' en '+guide.title:left,
     description,location:period?guideDestination(guide):left};
   }
   return {id:newId(),title:segment.slice(0,90),description:segment.slice(90),location:guideDestination(guide)};
  });
  return {id:newId(),title:'Día '+(i+1)+' · '+guide.title,activities,
   advice:'Ideas de la guía editorial de Viaja, organizadas por zonas. Verificá horarios, conexiones y entradas antes de reservar.'} as Day;
 });
}

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
 return createGuideItinerary(guide,count);
}
