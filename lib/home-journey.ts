import type {Plan} from './travel';

/** Prefer the trip happening now, then the nearest upcoming one, then the latest draft. */
export function selectHomeTrip(plans:Plan[],today:string):Plan|undefined{
 const priority=(plan:Plan)=>plan.trip.start&&plan.trip.end&&plan.trip.start<=today&&plan.trip.end>=today?0:
  plan.trip.start&&plan.trip.start>today?1:2;
 return [...plans].sort((a,b)=>{
  const score=priority(a)-priority(b);
  if(score)return score;
  if(priority(a)===1)return a.trip.start.localeCompare(b.trip.start);
  return (b.createdAt||'').localeCompare(a.createdAt||'');
 })[0];
}
