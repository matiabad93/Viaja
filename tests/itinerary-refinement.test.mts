import assert from 'node:assert/strict';
// @ts-ignore Node executes this suite with native TypeScript stripping.
import {mergeRefinedItinerary,refinementContext,removeItineraryDay} from '../lib/itinerary-refinement.ts';
import {validateTrip} from '../server/planner.ts';
import {geminiRequest} from '../server/gemini-planner.ts';
import {reconcileItinerarySchedule} from '../lib/itinerary-schedule.ts';
import {overlaps} from '../lib/agenda.ts';
import type {Day,Plan} from '../lib/travel.ts';

const existing:Day[]=[
 {id:'day-one',title:'Día 1 - Colmar',advice:'Comenzar por el casco histórico.',activities:[
  {id:'museum',title:'Museo Unterlinden',description:'Entrada ya planificada',completed:true,reservation:'Confirmada por mí',price:'25 €',time:'09:00'},
  {id:'canal',title:'Pequeña Venecia',description:'Paseo junto al canal',time:'12:00',completed:false}
 ]},
 {id:'day-two',title:'Día 2 - Estrasburgo',activities:[{id:'cathedral',title:'Catedral de Estrasburgo',description:'Visita reservada',reservation:'Pendiente'}]}
];
const original=JSON.stringify(existing);
assert.equal(removeItineraryDay(existing,'unknown'),null,'Un ID inexistente no borra nada');
assert.equal(removeItineraryDay([existing[0]],existing[0].id),null,'No se puede borrar el último día');
assert.deepEqual(removeItineraryDay(existing,'day-two'),[existing[0]],'Se borra únicamente el día solicitado');
assert.equal(JSON.stringify(existing),original,'Eliminar un día no muta los datos originales');
const suggestion:Day[]=[
 {id:'generated-a',title:'Otro día',advice:'Mejor recorrido con mercado navideño.',activities:[
  {id:'new-museum',title:'Museo Unterlinden',description:'Descripción ampliada y documentada.',time:'11:00'},
  {id:'new-canal',title:'Pequeña Venecia',description:'Detalles añadidos al paseo.',time:'13:00'},
  {id:'market',title:'Mercado navideño de Colmar',description:'Nueva parada',time:'16:00'},
  {id:'repeat',title:'Mercado navideño de Colmar',description:'Repetición del modelo',time:'16:15'}
 ]},
 {id:'generated-b',title:'Día 2 IA',activities:[
  {id:'new-cathedral',title:'Catedral de Estrasburgo',description:'Recomendaciones nuevas',time:'11:00'},
  {id:'duplicate-other-day',title:'Museo Unterlinden',description:'No repetir',time:'14:00'}
 ]},
 {id:'new-extra-day',title:'Día agregado por el modelo',activities:[]}
];
const changed=mergeRefinedItinerary(existing,suggestion);
assert.equal(changed.itinerary.length,2,'La IA no puede resucitar días eliminados ni añadir días fuera de la agenda');
assert.equal(changed.addedActivities,1,'Solo incorpora actividades originales');
assert.equal(changed.updatedActivities,3);
assert.equal(changed.itinerary[0].id,'day-one');
assert.equal(changed.itinerary[0].title,'Día 1 - Colmar');
assert.ok(changed.itinerary[0].advice?.includes('Comenzar por el casco histórico.'));
assert.ok(changed.itinerary[0].advice?.includes('Mejor recorrido con mercado navideño.'));
assert.equal(changed.itinerary[0].activities[0].id,'museum');
assert.equal(changed.itinerary[0].activities[0].completed,true);
assert.equal(changed.itinerary[0].activities[0].reservation,'Confirmada por mí');
assert.equal(changed.itinerary[0].activities[0].price,'25 €');
assert.equal(changed.itinerary[0].activities[0].time,'09:00','No modifica el horario de una actividad completada');
assert.equal(changed.itinerary[0].activities[1].id,'canal');
assert.equal(changed.itinerary[0].activities[1].time,'13:00','Sí puede proponer un horario para una parada pendiente');
assert.equal(changed.itinerary[0].activities[2].title,'Mercado navideño de Colmar');
assert.equal(changed.itinerary[1].activities.length,1,'No duplica visitas de otros días');
assert.equal(changed.itinerary[1].activities[0].reservation,'Pendiente');
assert.equal(JSON.stringify(existing),original,'La fusión no muta el original');
const second=mergeRefinedItinerary(changed.itinerary,suggestion);
assert.equal(second.addedActivities,0,'Mejorar el viaje nuevamente no duplica actividades');
assert.equal(second.itinerary[0].activities.length,3);
assert.equal(second.itinerary[0].advice,changed.itinerary[0].advice,'No repite los mismos consejos en cada consulta');

const trip={destination:'Colmar, Francia',origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',budget:0,travelers:2,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'Agregar mercados',sources:['official']};
const plan:Plan={id:'test',trip,kind:'draft',createdAt:'2026-11-01',itinerary:existing,
 logistics:{accommodations:[{id:'hotel',kind:'hotel',name:'Privado',address:'Mi dirección privada',checkIn:'',checkOut:'',status:'confirmed'}],transports:[]},
 expenses:[{id:'expense',date:'2026-11-27',label:'Compra privada',category:'Comida',amount:30}],
 collaboration:{version:2,ownerId:'secret-email',role:'owner'},refinementHistory:[{requestedAt:'2026-11-01',prompt:'Quiero mercados navideños',addedActivities:1,updatedActivities:0}]};
const context=refinementContext(plan);
assert.ok(context.includes('Museo Unterlinden'));
assert.ok(context.includes('"id":"museum"'));
assert.ok(context.includes('Quiero mercados navideños'));
for(const privateValue of ['Mi dirección privada','Compra privada','secret-email','Confirmada por mí'])assert.ok(!context.includes(privateValue),`No debe enviar ${privateValue} a la IA`);
const huge:Plan={...plan,itinerary:Array.from({length:31},(_,i)=>({id:String(i),title:'Jornada '+i,activities:Array.from({length:30},(_,j)=>({id:i+'-'+j,title:'Actividad '+i+' '+j,description:'Descripción de actividad'.repeat(20)}))}))};
assert.throws(()=>refinementContext(huge),/demasiado extenso/,'No oculta actividades sin avisar a la IA');
const normal:Plan={...plan,itinerary:Array.from({length:4},(_,i)=>({id:String(i),title:'Jornada '+i,activities:Array.from({length:7},(_,j)=>({id:i+'-'+j,title:'Actividad '+i+' '+j,description:'Descripción de actividad'.repeat(20)}))}))};
const compact=refinementContext(normal);
assert.ok(compact.length<=7200);
assert.equal(JSON.parse(compact).days.flatMap((d:any)=>d.activities).length,28,'Incluye todas las paradas existentes');

const unsorted:Day[]=[{id:'strasbourg',title:'Estrasburgo',activities:[
 {id:'tree',title:'Árbol de Place Kléber',time:'17:00',duration:'45 min',description:''},
 {id:'train',title:'Tren Mulhouse a Estrasburgo',time:'08:45',duration:'55 min',costCategory:'Transporte',description:''}
]}];
const sorted=reconcileItinerarySchedule(unsorted);
assert.deepEqual(sorted.days[0].activities.map(a=>a.id),['train','tree'],'El tren de las 08:45 aparece antes de la visita de las 17:00');
assert.equal(sorted.conflicts.length,0);
assert.equal(JSON.stringify(unsorted[0].activities.map(a=>a.id)),JSON.stringify(['tree','train']),'Ordenar no muta el viaje original');
const overlapping=reconcileItinerarySchedule([{...unsorted[0],activities:[
 unsorted[0].activities[1],{id:'sight',title:'Catedral',description:'',time:'09:00',duration:'60 min'}
]}]);
assert.equal(overlapping.days[0].activities[1].time,'09:55','Evita superponer visitas con el tren y reserva un margen para desplazarse');
assert.equal(overlapping.adjustments,1);
assert.equal(overlapping.days[0].activities.some(a=>overlaps(a,overlapping.days[0].activities)),false);
const blocked=reconcileItinerarySchedule([{...unsorted[0],activities:[
 unsorted[0].activities[1],{id:'booked',title:'Actividad con entrada confirmada',description:'',time:'09:00',duration:'60 min',reservation:'Confirmada por mí'}
]}]);
assert.ok(blocked.conflicts.length>0,'Rechaza reservas y transportes incompatibles sin cambiarlos silenciosamente');
const renamed=mergeRefinedItinerary(existing,[{id:'d',title:'Visitas',activities:[{id:'generated',refinesId:'museum',title:'Gran Museo de Unterlinden',description:'Historia ampliada',time:'12:00'}]}]);
assert.equal(renamed.itinerary[0].activities.filter(a=>a.id==='museum').length,1);
assert.equal(renamed.itinerary[0].activities[0].time,'09:00','Conserva reserva a pesar de propuesta de hora distinta');
assert.equal(renamed.addedActivities,0);
const refinable:Day[]=[{id:'day',title:'Estrasburgo',activities:[
 {id:'tree',title:'Árbol de Place Kléber',description:'Ya está en mi agenda',time:'17:00',duration:'45 min'},
 {id:'train',title:'Tren Mulhouse a Estrasburgo',description:'Mi traslado',time:'08:45',duration:'55 min',costCategory:'Transporte'}
]}];
const enriched=mergeRefinedItinerary(refinable,[{id:'suggested',title:'Estrasburgo',activities:[
 {id:'similar',title:'Árbol de Navidad de Place Kléber',description:'Otra descripción para el mismo árbol',time:'17:00',duration:'45 min'},
 {id:'new',title:'Catedral de Estrasburgo',description:'Nueva visita',time:'09:00',duration:'60 min'}
]}],'Agregá la catedral y mantené el árbol');
assert.deepEqual(enriched.itinerary[0].activities.map(a=>a.id),['train','new','tree']);
assert.equal(enriched.addedActivities,1,'El árbol con otro nombre no se duplica');
assert.equal(enriched.itinerary[0].activities[1].time,'09:55','La nueva catedral queda después del tren y el traslado');
assert.equal(enriched.conflicts.length,0);
assert.equal(enriched.itinerary[0].activities.some(a=>overlaps(a,enriched.itinerary[0].activities)),false);
const moved=mergeRefinedItinerary(existing,[{id:'first',title:'Día 1',activities:[]},{id:'second',title:'Día 2',activities:[
 {id:'moving',refinesId:'canal',title:'Pequeña Venecia',description:'Cambiamos de día',time:'14:00'}
]}],'Mové Pequeña Venecia al día 2');
assert.equal(moved.itinerary[0].activities.some(a=>a.id==='canal'),false);
assert.equal(moved.itinerary[1].activities.some(a=>a.id==='canal'),true);
const notMoved=mergeRefinedItinerary(existing,[{id:'first',title:'Día 1',activities:[]},{id:'second',title:'Día 2',activities:[
 {id:'moving',refinesId:'canal',title:'Pequeña Venecia',description:'Cambiamos de día',time:'14:00'}
]}],'Agregá detalles históricos');
assert.equal(notMoved.itinerary[0].activities.some(a=>a.id==='canal'),true,'El modelo no puede mover una parada entre días sin que se le haya pedido');
const validated=validateTrip({...trip,existingItinerary:context});
assert.equal(validated.existingItinerary,context,'El contexto llega al proveedor de forma validada');
assert.ok(JSON.stringify(geminiRequest(validated)).includes('Quiero mercados navideños'),'Gemini recibe el historial anterior');
assert.throws(()=>validateTrip({...trip,existingItinerary:'texto no estructurado'}),/contexto anterior/);
assert.throws(()=>validateTrip({...trip,existingItinerary:'x'.repeat(7501)}),/demasiado extenso/);
console.log('Refinamiento iterativo: preservación de datos, cero duplicados, historial, privacidad y límite de contexto — OK');
