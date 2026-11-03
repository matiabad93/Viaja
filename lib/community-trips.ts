import {itineraryOf,newId,type Plan,type Trip,type Day} from './travel.ts';

export type CommunityActivity={title:string;description:string;time?:string;duration?:string;location?:string};
export type CommunityDay={title:string;advice?:string;activities:CommunityActivity[]};
export type CommunityContent={route:string[];days:CommunityDay[]};
export type CommunityTrip={
 id:string;title:string;destination:string;days_count:number;pace:string;transport:string;
 content:CommunityContent;published_at:string;
};
const trim=(input:unknown,limit:number)=>typeof input==='string'?input.trim().slice(0,limit):'';

/** Only this explicitly whitelisted snapshot is made public. Never upload the Plan,
 * full Trip, origin, dates, passengers, budget, notes, sources, photos, payments,
 * reservations, trip IDs, expenses or completed-state flags.
 */
export function publicTripSnapshot(plan:Plan):{
 title:string;destination:string;days_count:number;pace:string;transport:string;content:CommunityContent
}{
 const destination=trim(plan.trip.destination,180);
 const route=[destination,...(plan.trip.additionalDestinations||[]).map(s=>trim(s,180))].filter(Boolean).slice(0,8);
 const itinerary=itineraryOf(plan);
 if(!destination||!itinerary.length||itinerary.length>31)throw Error('Podés publicar itinerarios de entre 1 y 31 días.');
 if(!itinerary.some(d=>d.activities.length>0))throw Error('Agregá alguna actividad antes de publicar el recorrido.');
 const days:CommunityDay[]=itinerary.map((day,i)=>{
  const activities:CommunityActivity[]=day.activities.slice(0,25).map(a=>({
   title:trim(a.title,150),description:trim(a.description,1500),
   ...(trim(a.time,12)?{time:trim(a.time,12)}:{}),
   ...(trim(a.duration,60)?{duration:trim(a.duration,60)}:{}),
   ...(trim(a.location,200)?{location:trim(a.location,200)}:{})
  })).filter(a=>a.title);
  const advice=trim(day.advice,1500);
  return {title:trim(day.title,150)||'Día '+(i+1),...(advice?{advice}:{}),activities};
 });
 const content={route,days};
 if(JSON.stringify(content).length>180000)throw Error('Este itinerario es demasiado grande para publicarse.');
 return {title:destination,destination,days_count:days.length,pace:trim(plan.trip.pace,30),
  transport:trim(plan.trip.transport,40),content};
}
/** A community template is a new draft, never a reference to or update of the original. */
export function communityTripToDraft(item:CommunityTrip):Plan{
 const route=Array.isArray(item.content?.route)?item.content.route.filter((s):s is string=>typeof s==='string').slice(0,8):[];
 const template:Trip={destination:route[0]||item.destination,additionalDestinations:route.slice(1),
  origin:'',start:'',end:'',travelers:2,budget:0,pace:item.pace||'Equilibrado',
  transport:item.transport||'Sin coche',notes:'',links:'',adjustment:'',sources:['official']};
 const itinerary:Day[]=(item.content?.days||[]).slice(0,31).map((day,i)=>({
  id:newId(),title:trim(day.title,150)||'Día '+(i+1),
  ...(trim(day.advice,1500)?{advice:trim(day.advice,1500)}:{}),
  activities:(Array.isArray(day.activities)?day.activities:[]).slice(0,25).map(a=>({
   id:newId(),title:trim(a.title,150),description:trim(a.description,1500),
   ...(a.time?{time:trim(a.time,12)}:{}),...(a.duration?{duration:trim(a.duration,60)}:{}),
   ...(a.location?{location:trim(a.location,200)}:{})
  })).filter(a=>a.title)
 }));
 return {id:newId(),createdAt:new Date().toISOString(),kind:'draft',trip:template,itinerary,expenses:[],parts:[],sources:[]};
}
