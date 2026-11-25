import type {Plan} from './travel.ts';

/**
 * Update or remove an AI-projected amount without changing the associated visit,
 * transport, its reservation or a recorded expense linked to the activity.
 * Returning null means that no valid change can be made.
 */
export function editProjectedCost(plan:Plan,activityId:string,amount:number|null):Plan|null{
 if(typeof activityId!=='string'||!activityId.trim())return null;
 if(amount!==null&&(!Number.isFinite(amount)||amount<0||amount>1000000))return null;
 let found=false;
 const itinerary=(plan.itinerary||[]).map(day=>({
  ...day,activities:day.activities.map(activity=>{
   if(activity.id!==activityId)return activity;
   found=true;
   return amount===null
    ?{...activity,estimatedCostEUR:undefined,costNote:undefined}
    :{...activity,estimatedCostEUR:Math.round(amount*100)/100,costNote:'Importe ajustado por el viajero; verificar precio.'};
  })
 }));
 return found?{...plan,itinerary}:null;
}
