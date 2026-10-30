import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Native Node TS stripping
import {reviewItineraryFeasibility,travelStops,projectedCosts,projectedCostTotal} from '../lib/trip-feasibility.ts';
// @ts-ignore Native Node TS stripping
import {validateTrip} from '../server/planner.ts';
const trip={destination:'Madrid, España',additionalDestinations:['Toledo, España'],origin:'Barcelona',start:'2026-11-13',end:'2026-11-16',travelers:2,budget:450,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official']};
assert.deepEqual(travelStops(trip),['Madrid, España','Toledo, España']);
assert.equal(validateTrip(trip).additionalDestinations.length,1);
assert.equal(reviewItineraryFeasibility(trip).blocking.length,0);
assert.ok(reviewItineraryFeasibility({...trip,end:'2026-11-13'}).blocking.length>0,'Too many cities for one day blocked');
assert.throws(()=>validateTrip({...trip,end:'2026-11-13'}),/un día por destino/);
assert.throws(()=>validateTrip({...trip,additionalDestinations:['Madrid, España']}),/destinos repetidos/);
assert.throws(()=>validateTrip({...trip,additionalDestinations:['']}),/destinos adicionales/);
assert.ok(reviewItineraryFeasibility({...trip,budget:25}).warnings.some(x=>x.includes('Presupuesto ajustado')));
assert.ok(reviewItineraryFeasibility({...trip,start:'2026-11-13',end:'2026-11-15',additionalDestinations:['Toledo, España','Segovia, España']}).warnings.some(x=>x.includes('traslados')));
const plan={trip,itinerary:[
 {id:'day1',title:'Madrid centro',activities:[{id:'prado',title:'Prado',description:'Entrada',estimatedCostEUR:36,costCategory:'Actividades'},{id:'retiro',title:'Retiro',description:'Paseo',estimatedCostEUR:0,costCategory:'Actividades'}]},
 {id:'day2',title:'Toledo',activities:[{id:'train',title:'Tren',description:'Traslado',estimatedCostEUR:55,costCategory:'Transporte'}]}
]};
assert.equal(projectedCostTotal(plan as any),91);
assert.deepEqual(projectedCosts(plan as any).map(x=>x.category),['Actividades','Actividades','Transporte']);
assert.equal(projectedCosts(plan as any)[2].date,'2026-11-14');
const ui=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
assert.ok(ui.includes('Probar con Madrid')&&ui.includes('TripStopsEditor'),'Planner includes Madrid sample and stops editor');
const guide=readFileSync(new URL('../components/travel-hub.tsx',import.meta.url),'utf8');
const barcelona=guide.slice(guide.indexOf("id:'barcelona'"),guide.indexOf("id:'lisboa'"));
assert.ok(barcelona.indexOf('Plaça de Catalunya')>=0,'Plaça Catalunya included');
assert.ok(barcelona.indexOf('Barrio Gótico')>=0&&barcelona.indexOf('El Born')>=0,'Gothic and Born included');
assert.equal(barcelona.split("','").slice(0,1)[0].includes('El Born'),true,'Gothic and Born in the same day');
console.log('Multi-city feasibility, validated stops, Barcelona guide and itemized projected expenses — OK');
