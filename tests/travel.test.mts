import assert from 'node:assert/strict';
// @ts-ignore Node runs this standalone suite with native TypeScript stripping.
import {itineraryOf,spent,daysCount,status,duplicate,safeURL,newId} from '../lib/travel.ts';
const trip={destination:'Barcelona',origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',budget:700,travelers:2,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official']};
const plan={id:'old',trip,kind:'draft' as const,createdAt:'2026-10-28',parts:[{text:'Día 1\nMuseo: Una visita. | Plaza: Un paseo.\nDía 2\nParque: Descansar.\nPresupuesto del grupo\nNo debe ser una actividad.',annotations:[]}],expenses:[{id:'a',date:'2026-10-28',label:'A',category:'Comida',amount:0.1},{id:'b',date:'2026-10-28',label:'B',category:'Comida',amount:0.2}]};
assert.equal(daysCount(trip),4);
assert.equal(status(plan,'2026-11-28'),'En curso');
assert.equal(status(plan,'2026-12-01'),'Finalizado');
assert.equal(status(plan,'2026-11-01'),'Próximo');
assert.equal(spent(plan),0.3);
const original=JSON.stringify(plan),days=itineraryOf(plan);
assert.equal(days.length,4);assert.equal(days[0].activities.length,2);assert.equal(days[1].activities.length,1);assert.equal(days[2].activities.length,0);
assert.equal(JSON.stringify(plan),original);
assert.equal(itineraryOf({...plan,parts:[{text:'Informe antiguo sin días identificables',annotations:[]}]}).every(d=>d.activities.length===0),true);
const customized={...plan,itinerary:[{id:'custom',title:'Editado',activities:[]}]};assert.deepEqual(itineraryOf(customized),customized.itinerary);
const copy=duplicate(plan);assert.notEqual(copy.id,plan.id);assert.equal(copy.expenses?.length,0);assert.deepEqual(copy.parts,plan.parts);assert.equal(JSON.stringify(plan),original);
assert.equal(safeURL('javascript:alert(1)'),false);assert.equal(safeURL('https://example.com'),true);
assert.notEqual(newId(),newId());
console.log('15 comprobaciones: fechas, estados, centavos, separación de días, fallback, preservación de datos, duplicación y URLs — OK');
