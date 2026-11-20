import type {Activity,Day,Plan} from './travel.ts';
import {itineraryOf} from './travel.ts';
import {timing} from './agenda.ts';
import {activityKind} from './activity-agenda.ts';

/**
 * Narratives are projections of the saved agenda, never a second AI plan.
 * A model's summary may describe activities that were subsequently moved,
 * protected, deduplicated or rejected during merge.
 */
const clean=(value:string|undefined)=>String(value||'').replace(/\s+/g,' ').trim();
const timeValue=(activity:Activity)=>timing(activity).start;
const ordered=(day:Day)=>day.activities.map((activity,index)=>({activity,index}))
 .sort((a,b)=>(timeValue(a.activity)??Number.POSITIVE_INFINITY)-(timeValue(b.activity)??Number.POSITIVE_INFINITY)||a.index-b.index)
 .map(item=>item.activity);
const typeLabel=(activity:Activity)=>({
 visit:'visita',transfer:'traslado',meal:'comida',break:'pausa'
})[activityKind(activity)];
const activityLabel=(activity:Activity)=>{
 const time=clean(activity.time);
 return (time?time+' · ':'')+clean(activity.title);
};
const lengthLabel=(activity:Activity)=>clean(activity.duration);
const confirmed=(activity:Activity)=>activity.reservation==='Confirmada por mí';
const transportDetails=(activity:Activity)=>{
 const t=activity.transportDetails;
 if(activityKind(activity)!=='transfer'||!t)return '';
 const stops=[clean(t.boardingStop||t.from),clean(t.arrivalStop||t.to)].filter(Boolean);
 return [clean(t.mode),clean(t.service),stops.length===2?stops.join(' → '):stops[0]].filter(Boolean).join(' · ');
};

/** The visible day guide follows the final, ordered, persisted activities. */
export function dayAdviceFromAgenda(day:Day):string {
 const activities=ordered(day);
 if(!activities.length)return 'Este día todavía no tiene actividades programadas. Agregá visitas, comidas o traslados para organizarlo.';
 const periods=[
  {label:'Por la mañana',items:[] as Activity[]},
  {label:'Al mediodía y primera tarde',items:[] as Activity[]},
  {label:'Por la tarde',items:[] as Activity[]},
  {label:'Por la noche',items:[] as Activity[]},
  {label:'Sin horario definido',items:[] as Activity[]}
 ];
 for(const activity of activities){
  const hour=timeValue(activity);
  const index=hour===null?4:hour<720?0:hour<960?1:hour<1200?2:3;
  periods[index].items.push(activity);
 }
 const parts:string[]=[];
 for(const period of periods){
  if(!period.items.length)continue;
  const details=period.items.map(activityLabel).join(' → ');
  const next=period.label+': '+details+'.';
  if(parts.join(' ').length+next.length>1160){
   parts.push('El resto de actividades está detallado en la agenda cronológica.');
   break;
  }
  parts.push(next);
 }
 const transfers=activities.filter(a=>activityKind(a)==='transfer');
 const note=transfers.length
  ?' Los traslados sin una reserva confirmada son estimaciones: comprobá el operador, las paradas y los márgenes antes de viajar.'
  :' Los horarios sugeridos son orientativos: revisá aperturas, entradas y reservas.';
 return (parts.join(' ')+note).slice(0,1500);
}

/** All report entries come from the same activity objects displayed in the UI. */
export function currentItineraryReport(plan:Plan):string {
 const days=itineraryOf(plan);
 const lines=[
  'VIAJA · ITINERARIO ACTUAL',
  [plan.trip.destination,...(plan.trip.additionalDestinations||[])].filter(Boolean).join(' → '),
  [plan.trip.start,plan.trip.end].filter(Boolean).join(' al '),
  '',
  'Este informe refleja la agenda guardada. Ante un cambio de horario, actividad o traslado, la agenda es la fuente de verdad.',
  ''
 ];
 for(let i=0;i<days.length;i++){
  const day=days[i];
  lines.push('DÍA '+(i+1)+' · '+clean(day.title));
  lines.push('Cómo aprovechar este día: '+dayAdviceFromAgenda(day));
  for(const activity of ordered(day)){
   const details=[typeLabel(activity),lengthLabel(activity),clean(activity.location),transportDetails(activity),confirmed(activity)?'reserva confirmada':activity.scheduleStatus==='verified'?'horario verificado':'horario orientativo']
    .filter(Boolean).join(' · ');
   lines.push('• '+activityLabel(activity)+(details?' ('+details+')':''));
   if(clean(activity.description))lines.push('  '+clean(activity.description));
   if(activityKind(activity)==='transfer'&&clean(activity.transportDetails?.verificationNote))
    lines.push('  Verificación: '+clean(activity.transportDetails?.verificationNote));
  }
  lines.push('');
 }
 lines.push('Antes de salir, comprobá horarios oficiales, conexiones, entradas y disponibilidad de reservas.');
 return lines.join('\n');
}

/** Call after merging and reconciling the agenda, not before. */
export function synchronizeItineraryNarrative(plan:Plan):Plan{
 const itinerary=itineraryOf(plan).map(day=>({...day,advice:dayAdviceFromAgenda(day)}));
 const aligned={...plan,itinerary};
 return {...aligned,parts:[{text:currentItineraryReport(aligned),annotations:[]}]};
}
