import type {Activity,Day,Plan} from './travel.ts';
import {itineraryOf} from './travel.ts';
import {reconcileItinerarySchedule} from './itinerary-schedule.ts';

const normalizeTitle=(title:string)=>title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const shorten=(value:string|undefined,length:number)=>(value||'').slice(0,length);
// A revised day guide replaces stale directions. Appending old advice makes it contradict the new route.
const revisedText=(previous:string|undefined,next:string|undefined)=>next?.trim()||previous;

/** Only public itinerary ideas travel to the AI. Expenses, reservations, members and files never do. */
export function refinementContext(plan:Plan):string{
 const days=itineraryOf(plan).map((day,index)=>({
  day:index+1,title:shorten(day.title,120),advice:shorten(day.advice,400),
  totalActivities:day.activities.length,
  activities:day.activities.map(a=>({id:a.id,title:shorten(a.title,110),time:shorten(a.time,6),duration:shorten(a.duration,12),location:shorten(a.location,90),description:shorten(a.description,220),fixed:Boolean(a.completed||a.reservation==='Confirmada por mí')}))
 }));
 const context={previousRequests:(plan.refinementHistory||[]).slice(-4).map(r=>shorten(r.prompt,180)),days};
 // Never silently omit an existing activity: the model might contradict what it cannot see.
 if(JSON.stringify(context).length>7200)for(const day of days){day.advice=shorten(day.advice,120);for(const item of day.activities)item.description=shorten(item.description,90)}
 if(JSON.stringify(context).length>7200)for(const day of days){day.advice='';for(const item of day.activities)item.description=''}
 if(JSON.stringify(context).length>7200)for(const day of days)for(const item of day.activities)item.location=shorten(item.location,35);
 if(JSON.stringify(context).length>7200)throw Error('Este itinerario es demasiado extenso para refinarlo de forma segura. Dividí el pedido por días o completá algunos cambios manualmente.');
 return JSON.stringify(context);
}

export type RefinementChanges={itinerary:Day[];addedActivities:number;updatedActivities:number;removedActivities:number;updatedDays:number;rescheduledActivities:number;warnings:string[];conflicts:string[]};

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
const canMoveDay=(prompt:string)=>/\b(move|mover|mov(i|e)|pasa|pasar|traslada|reorganiza|reordena|reestructura|optimiza|refina|mejora|intercambia|cambia\s+de\s+dia)\b/i.test(prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
const canRemove=(prompt:string)=>/\b(elimina|eliminar|borra|borrar|quita|quitar|saca|sacar|descarta|descartar|suprime|suprimir|reemplaza|reemplazar|sustituye|sustituir|en\s+lugar\s+de)\b/i.test(prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
const updateExisting=(current:Activity,idea:Activity):Activity=>{
 const locked=Boolean(current.completed||current.reservation==='Confirmada por mí');
 return {...current,
  title:locked?current.title:idea.title||current.title,
  description:idea.description||current.description,
  location:locked?current.location:idea.location||current.location,
  // Never keep a citation about the old destination if the AI changes the stop's identity.
  source:idea.source||(normalizeTitle(idea.title)===normalizeTitle(current.title)?current.source:undefined),
  time:locked?current.time:idea.time||current.time,
  duration:locked?current.duration:idea.duration||current.duration,
  endTime:locked?current.endTime:idea.endTime||current.endTime,
  estimatedCostEUR:locked?current.estimatedCostEUR:idea.estimatedCostEUR??current.estimatedCostEUR,
  costCategory:locked?current.costCategory:idea.costCategory||current.costCategory,
  costNote:idea.costNote||current.costNote
 };
};

/** A refinement makes a non-destructive diff; only a deliberate request can move an existing day entry. */
export function mergeRefinedItinerary(existing:Day[],proposal:Day[],userRequest=''):RefinementChanges{
 let updatedActivities=0,updatedDays=0,removedActivities=0;
 const warnings:string[]=[];
 const originalById=new Map<string,{activity:Activity;day:number}>();
 const originals=existing.flatMap((day,index)=>day.activities.map(activity=>{
  originalById.set(activity.id,{activity,day:index});return activity;
 }));
 const newIds=new Set<string>();
 const seenOriginalIds=new Set<string>();
 const itinerary=existing.map((day,index)=>{
  const next=proposal[index]?.unchanged?undefined:proposal[index];
  const title=revisedText(day.title,next?.title)||day.title;
  const advice=revisedText(day.advice,next?.advice);
  if(title!==day.title||advice!==day.advice)updatedDays++;
  // Strip AI-only removal directives from the persisted day.
  return {id:day.id,title,advice,activities:[...day.activities]};
 });
 if(canRemove(userRequest))for(let dayIndex=0;dayIndex<itinerary.length;dayIndex++){
  for(const id of proposal[dayIndex]?.removedActivityIds||[]){
   const original=originalById.get(id);
   if(!original)continue;
   const item=original.activity;
   if(item.completed||item.reservation==='Confirmada por mí'){
    warnings.push('No se eliminó «'+item.title+'» porque está realizada o tiene reserva confirmada.');continue;
   }
   if(itinerary[original.day].activities.some(activity=>activity.id===id)){
    itinerary[original.day].activities=itinerary[original.day].activities.filter(activity=>activity.id!==id);
    removedActivities++;seenOriginalIds.add(id);
   }
  }
 }
 const removedIds=new Set(originals.filter(activity=>!itinerary.some(day=>day.activities.some(item=>item.id===activity.id))).map(activity=>activity.id));
 const addedTitles:string[]=[];
 for(let dayIndex=0;dayIndex<itinerary.length;dayIndex++){
  const suggested=proposal[dayIndex];if(!suggested||suggested.unchanged)continue;
  for(const idea of suggested.activities){
   if(!idea.title.trim())continue;
   const byId=idea.refinesId?originalById.get(idea.refinesId):undefined;
   const sameDay=existing[dayIndex].activities.find(a=>samePlace(a.title,idea.title));
   const match=byId|| (sameDay?{activity:sameDay,day:dayIndex}:undefined);
   if(match){
    const {activity:current,day:oldDay}=match;
    if(seenOriginalIds.has(current.id))continue;
    seenOriginalIds.add(current.id);
    const protectedActivity=Boolean(current.completed||current.reservation==='Confirmada por mí');
    const destination=oldDay!==dayIndex&&(!canMoveDay(userRequest)||protectedActivity)?oldDay:dayIndex;
    if(destination!==dayIndex)warnings.push('Se mantuvo «'+current.title+'» en su día original'+(protectedActivity?' porque está realizada o confirmada.':' porque no pediste trasladarla.'));
    const updated=updateExisting(current,idea);
    if(JSON.stringify(updated)!==JSON.stringify(current)||oldDay!==destination)updatedActivities++;
    const previous=itinerary[oldDay].activities.findIndex(a=>a.id===current.id);
    if(previous>=0)itinerary[oldDay].activities.splice(previous,1);
    itinerary[destination].activities.push(updated);
    continue;
   }
   // Model proposals that resemble a stop already scheduled on another day aren't new visits.
   if(originals.some(a=>!removedIds.has(a.id)&&samePlace(a.title,idea.title))||addedTitles.some(title=>samePlace(title,idea.title)))continue;
   itinerary[dayIndex].activities.push({...idea,refinesId:undefined});
   newIds.add(idea.id);
   addedTitles.push(idea.title);
  }
 }
 const reconciled=reconcileItinerarySchedule(itinerary,newIds);
 const finalIds=new Set(reconciled.days.flatMap(d=>d.activities.map(a=>a.id)));
 const addedActivities=[...newIds].filter(id=>finalIds.has(id)).length;
 return {itinerary:reconciled.days,addedActivities,updatedActivities,removedActivities,updatedDays,rescheduledActivities:reconciled.adjustments,
  warnings:[...warnings,...reconciled.warnings],conflicts:reconciled.conflicts};
}
