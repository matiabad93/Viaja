import type {Activity,Day} from './travel.ts';
import {timing} from './agenda.ts';
import {activityKind} from './activity-agenda.ts';

const formatTime=(minutes:number)=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
const transport=(a:Activity)=>activityKind(a)==='transfer';
// An AI-generated train is only a tentative proposal. It must NOT be treated as
// an immutable booking; a user-confirmed reservation is immutable instead.
const fixed=(a:Activity)=>Boolean(a.completed||a.reservation==='Confirmada por mí');
const duration=(a:Activity)=>{
 const t=timing(a);
 if(t.duration&&t.duration>0)return t.duration;
 const end=a.endTime&&/^([01]\d|2[0-3]):[0-5]\d$/.test(a.endTime)?Number(a.endTime.slice(0,2))*60+Number(a.endTime.slice(3)):null;
 return t.start!==null&&end!==null&&end>t.start?end-t.start:45;
};
const startOf=(a:Activity)=>timing(a).start;
const buffer=(a:Activity,b:Activity)=>{
 if((a.location||'').trim()&&(a.location||'').trim().toLowerCase()===(b.location||'').trim().toLowerCase())return 0;
 return transport(a)||transport(b)?15:10;
};
const byTime=(a:Activity,b:Activity)=>{
 const one=startOf(a),two=startOf(b);
 return (one===null?Number.POSITIVE_INFINITY:one)-(two===null?Number.POSITIVE_INFINITY:two);
};

export type ScheduleReview={days:Day[];adjustments:number;warnings:string[];conflicts:string[]};

/**
 * Sort by actual start times, then place flexible visits around existing bookings and transfers.
 * If a booked/fixed commitment cannot fit, fail closed instead of publishing a contradictory plan.
 */
export function reconcileItinerarySchedule(days:Day[],newActivityIds:ReadonlySet<string>=new Set()):ScheduleReview{
 let adjustments=0;
 const warnings:string[]=[],conflicts:string[]=[];
 const result=days.map((day,dayIndex)=>{
  const numbered='Día '+(dayIndex+1);
  const ordered=day.activities.map((activity,index)=>({activity,index})).sort((a,b)=>byTime(a.activity,b.activity)||a.index-b.index);
  const booked=ordered.filter(({activity})=>fixed(activity)&&startOf(activity)!==null);
  const occupied:{start:number;end:number;activity:Activity}[]=[];
  const chosen=new Map<string,Activity>();
  for(const {activity} of booked){
   const start=startOf(activity)!;
   const end=start+duration(activity);
   if(end>=1440||occupied.some(slot=>start<slot.end+buffer(activity,slot.activity)&&slot.start<end+buffer(activity,slot.activity))){
    conflicts.push(numbered+': dos compromisos confirmados se superponen alrededor de «'+activity.title+'».');
   }
   occupied.push({start,end,activity});
   chosen.set(activity.id,activity);
  }
  const flexible=ordered.filter(({activity})=>!chosen.has(activity.id));
  // Existing activities take precedence over new AI suggestions when choosing free space.
  flexible.sort((a,b)=>Number(newActivityIds.has(a.activity.id))-Number(newActivityIds.has(b.activity.id))||byTime(a.activity,b.activity)||a.index-b.index);
  for(const {activity} of flexible){
   const wanted=startOf(activity);
   if(wanted===null){chosen.set(activity.id,activity);continue}
   const length=duration(activity);
   let next=wanted;
   const slots=[...occupied].sort((a,b)=>a.start-b.start);
   for(const slot of slots){
    const margin=buffer(activity,slot.activity);
    if(next+length+margin<=slot.start)break;
    if(next<slot.end+margin)next=slot.end+margin;
   }
   // A tentative transfer that originally preceded a confirmed appointment
   // cannot be silently pushed to AFTER that appointment: the booked visit
   // might be in the city the traveler was supposed to reach by train.
   if(transport(activity)&&booked.some(({activity:commitment})=>{
    const start=startOf(commitment);
    return start!==null&&wanted<start&&next>=start;
   })){
    conflicts.push(numbered+': el traslado «'+activity.title+'» no llega antes de un compromiso confirmado; revisá la conexión.');
    chosen.set(activity.id,activity);
    continue;
   }
   if(next+length>=1440){
    conflicts.push(numbered+': no hay espacio libre para «'+activity.title+'» sin alterar compromisos.');
    chosen.set(activity.id,activity);
    continue;
   }
   const moved=next!==wanted;
   if(moved)adjustments++;
   const corrected=moved?{...activity,time:formatTime(next),endTime:formatTime(next+length),duration:activity.duration||length+' min',
    // After adjusting the transfer start, a generated boarding/departure time
    // is no longer valid. Force the traveler to verify the new connection.
    ...(transport(activity)?{scheduleStatus:'estimated' as const,transportDetails:activity.transportDetails?{
     ...activity.transportDetails,boardingTime:undefined,arrivalTime:undefined,sourceUrl:undefined,
     verificationNote:'Horario reacomodado; verificá el servicio real antes de salir.'
    }:undefined}:{} )}:activity;
   chosen.set(activity.id,corrected);
   occupied.push({start:next,end:next+length,activity:corrected});
  }
  const activities=ordered.map(({activity})=>chosen.get(activity.id)).filter((a):a is Activity=>Boolean(a)).sort(byTime);
  return {...day,activities};
 });
 return {days:result,adjustments,warnings,conflicts};
}
