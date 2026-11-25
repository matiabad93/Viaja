import assert from 'node:assert/strict';
import {editProjectedCost} from '../lib/expense-estimates.ts';
import {projectedCosts,projectedCostTotal} from '../lib/trip-feasibility.ts';
import type {Plan} from '../lib/travel.ts';

const plan:Plan={
 id:'test',kind:'draft',createdAt:'2026-11-25',trip:{destination:'Colmar',origin:'Mulhouse',start:'2026-11-28',end:'2026-11-28',travelers:2,budget:300,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:[]},
 itinerary:[{id:'day',title:'Sábado',activities:[
  {id:'train',title:'Tren Mulhouse a Colmar',description:'Tren local',estimatedCostEUR:20,costCategory:'Transporte',costNote:'Sin verificar',time:'09:00'},
  {id:'bus',title:'Lanzadera',description:'Autobús regional',estimatedCostEUR:45,costCategory:'Transporte',time:'12:00'},
  {id:'visit',title:'Paseo',description:'Paseo a pie',estimatedCostEUR:0,costCategory:'Actividades'}]}],
 expenses:[{id:'paid',date:'2026-11-28',label:'Tren pagado',category:'Transporte',amount:12,linkedActivityId:'train'}]
};
const source=JSON.stringify(plan);
assert.equal(projectedCostTotal(plan),65);
const removed=editProjectedCost(plan,'train',null)!;
assert.equal(projectedCostTotal(removed),45,'Quitar estimación recalcula el total');
assert.equal(removed.itinerary?.[0].activities.length,3,'La actividad se conserva');
assert.equal(removed.itinerary?.[0].activities[0].time,'09:00','No cambia horario ni itinerario');
assert.equal(removed.itinerary?.[0].activities[0].estimatedCostEUR,undefined);
assert.deepEqual(removed.expenses,plan.expenses,'Los gastos reales quedan intactos');
assert.equal(projectedCosts(removed).some(p=>p.activityId==='train'),false);
const edited=editProjectedCost(removed,'bus',30.555)!;
assert.equal(projectedCostTotal(edited),30.56,'Redondea importes a céntimos');
const free=editProjectedCost(edited,'visit',null)!;
assert.equal(projectedCosts(free).some(p=>p.activityId==='visit'),false,'Las visitas gratis también se pueden quitar');
assert.equal(editProjectedCost(plan,'missing',null),null);
for(const invalid of [-1,Number.NaN,Number.POSITIVE_INFINITY,1000001])assert.equal(editProjectedCost(plan,'bus',invalid),null);
assert.equal(JSON.stringify(plan),source,'No muta el plan original');
console.log('Edición y eliminación de estimaciones: preservación de actividades y pagos, totales y validación — OK');
