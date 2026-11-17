import type {Trip} from './travel';

export const PLANNER_DRAFT_KEY='viaja-guided-planner-draft-v1';
export type PlannerDraft={trip:Trip;step:number;updatedAt:string};

type ReadStorage=Pick<Storage,'getItem'>;
type WriteStorage=Pick<Storage,'setItem'>;
type RemoveStorage=Pick<Storage,'removeItem'>;

export function hasMeaningfulPlannerDraft(trip:Trip):boolean{
 return Boolean(trip.destination?.trim()||trip.origin?.trim()||trip.start||trip.end||
  trip.notes?.trim()||trip.additionalDestinations?.some(x=>x.trim()));
}

export function readPlannerDraft(storage:ReadStorage):PlannerDraft|null{
 try{
  const raw=storage.getItem(PLANNER_DRAFT_KEY);
  if(!raw||raw.length>32000)return null;
  const value=JSON.parse(raw) as Record<string,unknown>;
  if(value.version!==1||!value.trip||typeof value.trip!=='object'||typeof value.step!=='number'||!Number.isInteger(value.step)||
   value.step<0||value.step>3)return null;
  const trip=value.trip as Trip;
  if(typeof trip.destination!=='string'||typeof trip.start!=='string'||typeof trip.end!=='string'||
   !Number.isInteger(trip.travelers)||trip.travelers<1||trip.travelers>12||
   (trip.additionalDestinations!==undefined&&(!Array.isArray(trip.additionalDestinations)||
    !trip.additionalDestinations.every(x=>typeof x==='string')))||!hasMeaningfulPlannerDraft(trip))return null;
  return {trip,step:value.step,updatedAt:typeof value.updatedAt==='string'?value.updatedAt:''};
 }catch{return null}
}

export function writePlannerDraft(storage:WriteStorage,trip:Trip,step:number):boolean{
 if(!hasMeaningfulPlannerDraft(trip)||!Number.isInteger(step)||step<0||step>3)return false;
 try{
  storage.setItem(PLANNER_DRAFT_KEY,JSON.stringify({version:1,trip,step,updatedAt:new Date().toISOString()}));
  return true;
 }catch{return false}
}

export function clearPlannerDraft(storage:RemoveStorage){
 try{storage.removeItem(PLANNER_DRAFT_KEY)}catch{/* Storage may be disabled in private mode. */}
}
