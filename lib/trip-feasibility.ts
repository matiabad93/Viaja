import type {Trip,Activity,Plan} from './travel.ts';

export function travelStops(trip:Pick<Trip,'destination'|'additionalDestinations'>):string[]{
 return [trip.destination,...(trip.additionalDestinations||[])].map(x=>x.trim()).filter(Boolean);
}
export type PlanningReview={blocking:string[];warnings:string[];destinations:string[];days:number};
export function reviewItineraryFeasibility(trip:Trip):PlanningReview{
 const destinations=travelStops(trip),blocking:string[]=[],warnings:string[]=[];
 const days=trip.start&&trip.end?Math.floor((Date.parse(trip.end)-Date.parse(trip.start))/86400000)+1:0;
 if(!Number.isFinite(days)||days<1)return {destinations,days:0,blocking:[],warnings:[]};
 if(destinations.length>6)blocking.push('Por ahora podés planificar hasta 6 destinos por viaje. Reducí la cantidad.');
 if(destinations.length>days)blocking.push('Hay '+destinations.length+' destinos para '+days+' días. Necesitás como mínimo un día por destino; reducí ciudades o ampliá fechas.');
 const normalized=destinations.map(s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
 if(new Set(normalized).size!==normalized.length)blocking.push('Hay destinos repetidos. Revisá el orden de las ciudades.');
 if(destinations.length>1&&days<destinations.length*2-1&&!blocking.length)
  warnings.push('Itinerario exigente: '+destinations.length+' destinos en '+days+' días. Los traslados entre ciudades quitarán tiempo a las visitas; considerá más días.');
 if(trip.budget>0&&trip.travelers>0&&days>0){
  const dailyPerPerson=trip.budget/(days*trip.travelers);
  if(dailyPerPerson<18)warnings.push('Presupuesto ajustado ('+dailyPerPerson.toFixed(0)+' € por persona/día para comidas, visitas y transporte). No podemos confirmar que alcance sin cotizaciones.');
  if(destinations.length>1)warnings.push('El presupuesto debe prever traslados entre destinos además de entradas y transporte local; aún no se conocen los precios reales.');
 }
 if(destinations.length>1)warnings.push('El orden de destinos es orientativo: antes de reservar, verificá distancias, conexiones y tiempos de viaje reales.');
 return {blocking,warnings,days,destinations};
}
export type ProjectedCost={activityId:string;date:string;label:string;category:'Transporte'|'Actividades'|'Comida';amount:number;description:string};
export function projectedCosts(plan:Plan):ProjectedCost[]{
 const days=plan.itinerary||[];
 const results:ProjectedCost[]=[];
 for(const [i,day] of days.entries()){
  const date=plan.trip.start?new Date(Date.parse(plan.trip.start)+i*86400000).toISOString().slice(0,10):'';
  for(const a of day.activities){
   if(a.estimatedCostEUR===undefined||a.estimatedCostEUR===null||!Number.isFinite(a.estimatedCostEUR)||a.estimatedCostEUR<0)continue;
   results.push({activityId:a.id,date,label:a.title,category:a.costCategory||'Actividades',amount:Math.round(a.estimatedCostEUR*100)/100,description:a.costNote||'Importe orientativo para el grupo, no verificado'});
  }
 }
 return results;
}
export function projectedCostTotal(plan:Plan):number{
 return Math.round(projectedCosts(plan).reduce((sum,x)=>sum+x.amount,0)*100)/100;
}
