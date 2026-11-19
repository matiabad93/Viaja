import type {Activity,Day,Plan} from './travel.ts';
import {itineraryOf} from './travel.ts';

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
  day:index+1,title:shorten(day.title,120),advice:shorten(day.advice,180),
  totalActivities:day.activities.length,
  activities:day.activities.map(a=>({title:shorten(a.title,120),time:shorten(a.time,6),location:shorten(a.location,100),description:shorten(a.description,160)}))
 }));
 const context={previousRequests:(plan.refinementHistory||[]).slice(-5).map(r=>shorten(r.prompt,250)),days};
 // The AI gateway caps the complete request at 16 KB. Keep enough room for trip details.
 while(JSON.stringify(context).length>7200){
  const largest=days.reduce((best,day,index)=>day.activities.length>days[best].activities.length?index:best,0);
  if(days[largest]?.activities.length){days[largest].activities.pop();continue}
  for(const day of days)day.advice='';
  break;
 }
 return JSON.stringify(context);
}

export type RefinementChanges={itinerary:Day[];addedActivities:number;updatedActivities:number};

/** Never leave a plan with zero days or remove an item that was not selected. */
export function removeItineraryDay(days:Day[],id:string):Day[]|null{
 if(days.length<=1||!days.some(day=>day.id===id))return null;
 return days.filter(day=>day.id!==id);
}

/** A refinement may improve matching ideas and add new ones, but never erase the user's agenda. */
export function mergeRefinedItinerary(existing:Day[],proposal:Day[]):RefinementChanges{
 let addedActivities=0,updatedActivities=0;
 const allExisting=new Set(existing.flatMap(day=>day.activities.map(a=>normalizeTitle(a.title))).filter(Boolean));
 const itinerary=existing.map((day,index)=>{
  const proposed=proposal[index];
  if(!proposed)return day;
  const originalByTitle=new Map(day.activities.map(a=>[normalizeTitle(a.title),a]));
  const seen=new Set<string>();
  const changes=new Map<string,Activity>();
  const additions:Activity[]=[];
  for(const idea of proposed.activities){
   const key=normalizeTitle(idea.title);
   if(!key||seen.has(key))continue;
   seen.add(key);
   const current=originalByTitle.get(key);
   if(current){
    // Preserve identity, completion, booking state and user-recorded costs.
    const updated:Activity={...current,
     description:idea.description||current.description,
     location:current.location||idea.location,
     time:current.completed||current.reservation?current.time:idea.time||current.time,
     duration:current.completed||current.reservation?current.duration:idea.duration||current.duration,
     endTime:current.completed||current.reservation?current.endTime:idea.endTime||current.endTime,
     estimatedCostEUR:current.estimatedCostEUR??idea.estimatedCostEUR,
     costCategory:current.costCategory||idea.costCategory,
     costNote:current.costNote||idea.costNote
    };
    if(JSON.stringify(updated)!==JSON.stringify(current))updatedActivities++;
    changes.set(key,updated);
   }else if(!allExisting.has(key)){
    additions.push(idea);
    allExisting.add(key);
    addedActivities++;
   }
  }
  const placeholder=/por organizar|por dise[nñ]ar|un d[ií]a m[aá]s para explorar/i.test(day.title);
  return {...day,
   title:placeholder?proposed.title||day.title:day.title,
   advice:keepAdvice(day.advice,proposed.advice),
   activities:[...day.activities.map(a=>changes.get(normalizeTitle(a.title))||a),...additions]
  };
 });
 return {itinerary,addedActivities,updatedActivities};
}
