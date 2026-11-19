import assert from 'node:assert/strict';
// @ts-ignore Node executes this suite with native TypeScript stripping.
import {mergeRefinedItinerary,refinementContext,removeItineraryDay} from '../lib/itinerary-refinement.ts';
import {validateTrip} from '../server/planner.ts';
import {geminiRequest} from '../server/gemini-planner.ts';
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
assert.ok(context.includes('Quiero mercados navideños'));
for(const privateValue of ['Mi dirección privada','Compra privada','secret-email','Confirmada por mí'])assert.ok(!context.includes(privateValue),`No debe enviar ${privateValue} a la IA`);
const huge:Plan={...plan,itinerary:Array.from({length:31},(_,i)=>({id:String(i),title:'Jornada '+i,activities:Array.from({length:30},(_,j)=>({id:i+'-'+j,title:'Actividad '+i+' '+j,description:'Descripción de actividad'.repeat(20)}))}))};
const compact=refinementContext(huge);
assert.ok(compact.length<=7200);
assert.equal(JSON.parse(compact).days.length,31);
const validated=validateTrip({...trip,existingItinerary:context});
assert.equal(validated.existingItinerary,context,'El contexto llega al proveedor de forma validada');
assert.ok(JSON.stringify(geminiRequest(validated)).includes('Quiero mercados navideños'),'Gemini recibe el historial anterior');
assert.throws(()=>validateTrip({...trip,existingItinerary:'texto no estructurado'}),/contexto anterior/);
assert.throws(()=>validateTrip({...trip,existingItinerary:'x'.repeat(7501)}),/demasiado extenso/);
console.log('Refinamiento iterativo: preservación de datos, cero duplicados, historial, privacidad y límite de contexto — OK');
