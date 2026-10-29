import {timing} from './agenda.ts';
import type {Activity} from './travel.ts';
export const PIXELS_PER_MINUTE=1.1;
export function calendarGeometry(activities:Activity[]){
 const scheduled=activities.map(activity=>({activity,...timing(activity)})).filter((x):x is typeof x & {start:number}=>x.start!==null).sort((a,b)=>a.start-b.start);
 const start=Math.floor(Math.min(480,...scheduled.map(x=>x.start))/60)*60;
 const end=Math.ceil(Math.max(1260,...scheduled.map(x=>x.end??x.start+45))/60)*60;
 const height=(end-start)*PIXELS_PER_MINUTE;
 const slots=scheduled.map(x=>{
  const finish=Math.min(1440,Math.max(x.start+15,x.end??x.start+45));
  const overlapping=scheduled.filter(other=>other!==x&&other.start<finish&&(other.end??other.start+45)>x.start);
  return {activity:x.activity,start:x.start,end:finish,top:(x.start-start)*PIXELS_PER_MINUTE,height:(finish-x.start)*PIXELS_PER_MINUTE,conflict:overlapping.length>0}
 });
 return {start,end,height,slots};
}
export function hourLabel(minute:number){return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0')}
