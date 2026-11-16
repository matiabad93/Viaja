import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript stripping
import {selectVisibleTrips,tripFilterCounts} from '../lib/trip-list.ts';
import type {Plan} from '../lib/travel.ts';

const make=(id:string,destination:string,start:string,end:string,createdAt:string,extra:string[]=[],origin='Barcelona')=>({
 id,createdAt,kind:'draft',trip:{destination,start,end,additionalDestinations:extra,origin}
}) as Plan;
const plans=[
 make('past','Edimburgo, Escocia','2026-10-01','2026-10-03','2026-10-04'),
 make('far','París, Francia','2026-12-18','2026-12-20','2026-11-01',['Brujas, Bélgica']),
 make('undated','Málaga, España','','','2026-11-15'),
 make('soon','Roma, Italia','2026-11-20','2026-11-23','2026-11-13'),
 make('now','Colmar, Francia','2026-11-14','2026-11-18','2026-11-14')
];
const today='2026-11-16';
assert.deepEqual(selectVisibleTrips(plans,'','Todos','Relevancia',today).map(p=>p.id),['now','soon','far','undated','past']);
assert.deepEqual(tripFilterCounts(plans,today),{'Todos':5,'En curso':1,'Próximo':2,'Sin fechas':1,'Finalizado':1});
assert.deepEqual(selectVisibleTrips(plans,'brujas','Todos','Relevancia',today).map(p=>p.id),['far'],'Search covers all stops');
assert.deepEqual(selectVisibleTrips(plans,'Malaga','Todos','Relevancia',today).map(p=>p.id),['undated'],'Search ignores accents');
assert.deepEqual(selectVisibleTrips(plans,'BARCELONA','Todos','Relevancia',today).map(p=>p.id),['now','soon','far','undated','past'],'Search covers city of origin');
assert.deepEqual(selectVisibleTrips(plans,'','Finalizado','Relevancia',today).map(p=>p.id),['past']);
assert.deepEqual(selectVisibleTrips(plans,'','Todos','Más recientes',today).map(p=>p.id),['undated','now','soon','far','past']);
assert.deepEqual(selectVisibleTrips(plans,'','Todos','Destino A–Z',today).map(p=>p.id),['now','past','undated','far','soon']);
assert.deepEqual(plans.map(p=>p.id),['past','far','undated','soon','now'],'Filtering does not mutate the saved plans');
console.log('PASS: trip discovery, counts, sorting and accent-insensitive searches');
