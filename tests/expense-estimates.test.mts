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

const renamed=editProjectedCost(plan,'bus',39.90,'Lanzadera navideña','Transporte')!;
assert.equal(renamed.itinerary?.[0].activities[1].title,'Lanzadera','El concepto del gasto no cambia el título de la actividad');
assert.equal(projectedCosts(renamed).find(p=>p.activityId==='bus')?.label,'Lanzadera navideña');
assert.equal(projectedCosts(renamed).find(p=>p.activityId==='bus')?.amount,39.9);
assert.equal(editProjectedCost(plan,'bus',30,'   '),null);
assert.equal(removed.itinerary?.[0].activities[0].costEstimateDismissed,true);
const restored=editProjectedCost(removed,'train',15,'Billete de tren')!;
assert.equal(projectedCosts(restored).find(p=>p.activityId==='train')?.amount,15);
assert.deepEqual(renamed.expenses,plan.expenses);
assert.equal(JSON.stringify(plan),source);
console.log('Concepto independiente y eliminación persistente — OK');

import {readFileSync} from 'node:fs';
const forecastUI=readFileSync(new URL('../components/expense-panel.tsx',import.meta.url),'utf8');
const actionsCSS=readFileSync(new URL('../components/expense-estimate-actions.module.css',import.meta.url),'utf8');
assert.ok(forecastUI.includes("aria-label={'Editar pendiente de '+item.label}"));
assert.ok(forecastUI.includes("aria-label={'Registrar gasto de '+item.label}"));
assert.ok(forecastUI.includes("onClick={()=>openPending(item,'register')}"),'Registrar abre primero el formulario');
assert.ok(forecastUI.includes("filter(item=>!paidIds.has(item.activityId))"),'Los pagos registrados salen de Pendientes');
assert.ok(forecastUI.includes("paidIds.has(value.linkedActivityId)"),'Evita registrar dos veces');
assert.ok(forecastUI.includes("Confirmar gasto"));
assert.ok(forecastUI.includes("role=\"alert\""));
assert.match(actionsCSS,/width:44px;height:44px/,'Acciones táctiles de al menos 44 píxeles');
console.log('Flujo de revisión y acciones accesibles — OK');
