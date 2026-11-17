import type {Plan} from './travel';
import {status} from './travel.ts';

export const tripFilters=['Todos','En curso','Próximo','Sin fechas','Finalizado'] as const;
export type TripFilter=typeof tripFilters[number];
export type TripSort='Relevancia'|'Más recientes'|'Destino A–Z';

const normalize=(value:string)=>value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const newest=(a:Plan,b:Plan)=>(b.createdAt||'').localeCompare(a.createdAt||'');

/** Find trips across every stop, not only their main destination. */
export function selectVisibleTrips(plans:Plan[],query:string,filter:TripFilter,sort:TripSort,today:string):Plan[]{
 const term=normalize(query);
 const visible=plans.filter(p=>(filter==='Todos'||status(p,today)===filter)&&(
  !term||[p.trip.destination,p.trip.origin,...(p.trip.additionalDestinations||[])].some(value=>normalize(value||'').includes(term))
 ));
 if(sort==='Más recientes')return visible.sort((a,b)=>newest(a,b)||a.id.localeCompare(b.id));
 if(sort==='Destino A–Z')return visible.sort((a,b)=>a.trip.destination.localeCompare(b.trip.destination,'es',{sensitivity:'base'})||newest(a,b));
 const order:Record<Exclude<TripFilter,'Todos'>,number>={'En curso':0,'Próximo':1,'Sin fechas':2,'Finalizado':3};
 return visible.sort((a,b)=>{
  const sa=status(a,today),sb=status(b,today);
  const category=order[sa]-order[sb];if(category)return category;
  if(sa==='En curso')return (a.trip.end||'').localeCompare(b.trip.end||'')||newest(a,b);
  if(sa==='Próximo')return (a.trip.start||'').localeCompare(b.trip.start||'')||newest(a,b);
  if(sa==='Finalizado')return (b.trip.end||'').localeCompare(a.trip.end||'')||newest(a,b);
  return newest(a,b)||a.id.localeCompare(b.id);
 });
}

export function tripFilterCounts(plans:Plan[],today:string):Record<TripFilter,number>{
 const result:Record<TripFilter,number>={'Todos':plans.length,'En curso':0,'Próximo':0,'Sin fechas':0,'Finalizado':0};
 for(const trip of plans)result[status(trip,today) as Exclude<TripFilter,'Todos'>]++;
 return result;
}
