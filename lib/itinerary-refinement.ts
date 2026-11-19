import type {Activity,Day,Plan} from './travel.ts';
import {itineraryOf} from './travel.ts';
import {reconcileItinerarySchedule} from './itinerary-schedule.ts';

const normalizeTitle=(title:string)=>title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const shorten=(value:string|undefined,length:number)=>(value||'').slice(0,length);
const keepAdvice=(previous:string|undefined,next:string|undefined)=>{
 if(!previous)return next;
 if(!next||previous.includes(next))return previous;
 const combined=previous+'\n\nConsejo adicional de IA: '+next;
 return combined.length<=4000?combined:previous;
};

/** Only public itinerary ideas travel to the AI. Expenses, reservations, members and files never do. */
export function refinementContext(plan:Plan):string{
 const days=itineraryOf(plan).map((day,index)=>({
  day:index+1,title:shorten(day.title,100),advice:shorten(day.advice,100),
  totalActivities:day.activities.length,
  activities:day.activities.map(a=>({id:a.id,title:shorten(a.title,95),time:shorten(a.time,6),duration:shorten(a.duration,12),location:shorten(a.location,70),description:shorten(a.description,100),fixed:Boolean(a.completed||a.reservation==='Confirmada por mí')}))
 }));
 const context={previousRequests:(plan.refinementHistory||[]).slice(-4).map(r=>shorten(r.prompt,180)),days};
 // Never silently omit an existing activity: the model might contradict what it cannot see.
 if(JSON.stringify(context).length>7200)for(const day of days){day.advice='';for(const item of day.activities)item.description=''}
 if(JSON.stringify(context).length>7200)for(const day of days)for(const item of day.activities)item.location=shorten(item.location,35);
 if(JSON.stringify(context).length>7200)throw Error('Este itinerario es demasiado extenso para refinarlo de forma segura. Dividí el pedido por días o completá algunos cambios manualmente.');
 return JSON.stringify(context);
}

export type RefinementChanges={itinerary:Day[];addedActivities:number;updatedActivities:number;rescheduledActivities:number;warnings:string[];conflicts:string[]};

/** Never leave a plan with zero days or remove an item that was not selected. */
export function removeItineraryDay(days:Day[],id:string):Day[]|null{
 if(days.length<=1||!days.some(day=>day.id===id))return null;
 return days.filter(day=>day.id!==id);
}

const significantTokens=(title:string)=>normalizeTitle(title).split(' ').filter(word=>word.length>=3&&!['visita','visitar','paseo','recorrido','desde','hasta','para','entre','sobre','cerca','gran','grande','nuevo'].includes(word));
const samePlace=(first:string,second:string)=>{
 const a=significantTokens(first),b=significantTokens(second);
 if(!a.length||!b.length)return false;
 if(a.join(' ')===b.join(' '))return true;
 const overlap=a.filter(word=>b.includes(word)).length;
 return overlap>=2&&overlap/new Set([...a,...b]).size>=0.66;
};
const canMoveDay=(prompt:string)=>/\b(move|mover|mov(i|e)|pasa|pasar|traslada|reorganiza|intercambia|cambia\s+de\s+dia)\b/i.test(prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
const updateExisting=(current:Activity,idea:Activity):Activity=>{
 const locked=Boolean(current.completed||current.reservation==='Confirmada por mí');
 return {...current,
  description:idea.description||current.description,
  location:current.location||idea.location,
  time:locked?current.time:idea.time||current.time,
  duration:locked?current.duration:idea.duration||current.duration,
  endTime:locked?current.endTime:idea.endTime||current.endTime,
  estimatedCostEUR:current.estimatedCostEUR??idea.estimatedCostEUR,
  costCategory:current.costCategory||idea.costCategory,
  costNote:current.costNote||idea.costNote
 };
};

/** A refinement makes a non-destructive diff; only a deliberate request can move an existing day entry. */
export function mergeRefinedItinerary(existing:Day[],proposal:Day[],userRequest=''):RefinementChanges{
 let updatedActivities=0;
 const warnings:string[]=[];
 const originalById=new Map<string,{activity:Activity;day:number}>();
 const originals=existing.flatMap((day,index)=>day.activities.map(activity=>{
  originalById.set(activity.id,{activity,day:index});return activity;
 }));
 const itinerary=existing.map((day,index)=>({...day,
  title:/por organizar|por dise[nñ]ar|un d[ií]a m[aá]s para explorar/i.test(day.title)?proposal[index]?.title||day.title:day.title,
  advice:keepAdvice(day.advice,proposal[index]?.advice),activities:[...day.activities]
 }));
 const newIds=new Set<string>();
 const seenOriginalIds=new Set<string>();
 const addedTitles:string[]=[];
 for(let dayIndex=0;dayIndex<itinerary.length;dayIndex++){
  const suggested=proposal[dayIndex];if(!suggested)continue;
  for(const idea of suggested.activities){
   if(!idea.title.trim())continue;
   const byId=idea.refinesId?originalById.get(idea.refinesId):undefined;
   const sameDay=existing[dayIndex].activities.find(a=>samePlace(a.title,idea.title));
   const match=byId|| (sameDay?{activity:sameDay,day:dayIndex}:undefined);
   if(match){
    const {activity:current,day:oldDay}=match;
    if(seenOriginalIds.has(current.id))continue;
    seenOriginalIds.add(current.id);
    if(oldDay!==dayIndex&&!canMoveDay(userRequest)){
     warnings.push('Se mantuvo «'+current.title+'» en su día original porque no pediste trasladarla.');
     continue;
    }
    const updated=updateExisting(current,idea);
    if(JSON.stringify(updated)!==JSON.stringify(current)||oldDay!==dayIndex)updatedActivities++;
    const previous=itinerary[oldDay].activities.findIndex(a=>a.id===current.id);
    if(previous>=0)itinerary[oldDay].activities.splice(previous,1);
    itinerary[dayIndex].activities.push(updated);
    continue;
   }
   // Model proposals that resemble a stop already scheduled on another day aren't new visits.
   if(originals.some(a=>samePlace(a.title,idea.title))||addedTitles.some(title=>samePlace(title,idea.title)))continue;
   itinerary[dayIndex].activities.push({...idea,refinesId:undefined});
   newIds.add(idea.id);
   addedTitles.push(idea.title);
  }
 }
 const reconciled=reconcileItinerarySchedule(itinerary,newIds);
 const finalIds=new Set(reconciled.days.flatMap(d=>d.activities.map(a=>a.id)));
 const addedActivities=[...newIds].filter(id=>finalIds.has(id)).length;
 return {itinerary:reconciled.days,addedActivities,updatedActivities,rescheduledActivities:reconciled.adjustments,
  warnings:[...warnings,...reconciled.warnings],conflicts:reconciled.conflicts};
}
