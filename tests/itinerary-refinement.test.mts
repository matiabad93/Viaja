import assert from 'node:assert/strict';
// @ts-ignore Node executes this suite with native TypeScript stripping.
import {mergeRefinedItinerary,refinementContext,removeItineraryDay} from '../lib/itinerary-refinement.ts';
import {validateTrip} from '../server/planner.ts';
import {geminiRequest,geminiFreePlanner,GEMINI_TIMEOUT_MS,normalizeGeminiIdeas} from '../server/gemini-planner.ts';
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
assert.equal(changed.itinerary[0].title,'Otro día','La descripción del día también se puede reescribir');
assert.equal(changed.itinerary[0].advice,'Mejor recorrido con mercado navideño.','Los consejos nuevos sustituyen los obsoletos');
assert.equal(changed.updatedDays,2,'Se revisan los títulos y consejos de las jornadas');
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
const optimized=mergeRefinedItinerary(existing,[{id:'first',title:'Día 1',activities:[]},{id:'second',title:'Día 2',activities:[
 {id:'moving',refinesId:'canal',title:'Pequeña Venecia',description:'Ruta más práctica',time:'14:00'}
]}],'Mejorá el viaje y optimizá la ruta entre días');
assert.equal(optimized.itinerary[1].activities.some(a=>a.id==='canal'),true,'Una mejora general sí puede cambiar una visita de día para optimizar el recorrido');
const protectedMove=mergeRefinedItinerary(existing,[{id:'first',title:'Día 1',activities:[]},{id:'second',title:'Día 2',activities:[
 {id:'new-museum',refinesId:'museum',title:'Museo Unterlinden',description:'Nueva explicación',time:'18:00'}
]}],'Mové todas las actividades del primer día al segundo');
assert.equal(protectedMove.itinerary[0].activities.some(a=>a.id==='museum'),true,'No se mueve a otro día una actividad completada o con reserva');
assert.equal(protectedMove.itinerary[0].activities.find(a=>a.id==='museum')?.time,'09:00');
const progressive:Day[]=[{id:'journey',title:'Día 1 — Visitas rápidas',advice:'Caminar primero por el norte.',activities:[
 {id:'old-square',title:'Plaza principal',description:'Visita breve',location:'Plaza Mayor',time:'10:00',duration:'30 min',estimatedCostEUR:0},
 {id:'old-museum',title:'Museo pequeño',description:'Visita anterior',location:'Calle Antigua',time:'12:00',duration:'45 min'}
]}];
const revised=mergeRefinedItinerary(progressive,[{id:'proposal',title:'Día 1 — Arte y paseo por el centro',advice:'Primero el museo nuevo; luego la plaza junto al mercado.',activities:[
 {id:'edited-museum',refinesId:'old-museum',title:'Museo de Historia Renovado',description:'Una visita de arte mucho más completa.',location:'Avenida Nueva',time:'09:00',duration:'90 min'},
 {id:'edited-square',refinesId:'old-square',title:'Plaza Mayor y mercado artesanal',description:'Recorrer los puestos de artesanía.',location:'Plaza Mayor',time:'11:00',duration:'60 min'}
]}],'Reorganizá las visitas y mejorá el museo antes de la plaza');
assert.deepEqual(revised.itinerary[0].activities.map(a=>a.id),['old-museum','old-square'],'El recorrido entero cambia de orden y horarios manteniendo identidad');
assert.equal(revised.itinerary[0].activities[0].title,'Museo de Historia Renovado','La IA puede renombrar una actividad editable');
assert.equal(revised.itinerary[0].activities[0].location,'Avenida Nueva','La IA puede corregir una ubicación editable');
assert.equal(revised.itinerary[0].activities[0].description,'Una visita de arte mucho más completa.','La IA puede reemplazar consejos de actividades');
assert.equal(revised.itinerary[0].activities[0].duration,'90 min');
assert.equal(revised.itinerary[0].advice,'Primero el museo nuevo; luego la plaza junto al mercado.');
assert.equal(revised.itinerary[0].title,'Día 1 — Arte y paseo por el centro');
assert.equal(revised.updatedActivities,2,'Las propuestas actualizan actividades anteriores en vez de agregarlas duplicadas');
assert.equal(revised.addedActivities,0);
const nextRevision=mergeRefinedItinerary(revised.itinerary,[{id:'new-proposal',title:'Día 1 — Ruta gastronómica y cultural',advice:'Revisar el recorrido a pie después de almorzar.',activities:[
 {id:'updated-again',refinesId:'old-museum',title:'Museo de Historia Renovado',description:'Guía mejorada por segunda vez.',location:'Avenida Nueva',time:'13:00',duration:'60 min'}
]}],'Volvé a organizar el museo por la tarde');
assert.equal(nextRevision.itinerary[0].activities.find(a=>a.id==='old-museum')?.time,'13:00','Se puede refinar sucesivamente la misma actividad');
assert.equal(nextRevision.itinerary[0].activities.length,2,'No pierde la visita existente omitida de la última propuesta');
assert.equal(nextRevision.itinerary[0].advice,'Revisar el recorrido a pie después de almorzar.','Los consejos no acumulan instrucciones contradictorias');
const removalProposal:Day[]=[{id:'replace',title:'Día 1 — Otro recorrido',advice:'El museo reemplaza la plaza.',removedActivityIds:['old-square'],activities:[
 {id:'replacement',title:'Mercado histórico',description:'Alternativa',location:'Centro',time:'10:00',duration:'40 min'}
]}];
const replaced=mergeRefinedItinerary(progressive,removalProposal,'Reemplazá la Plaza principal por el mercado histórico');
assert.equal(replaced.removedActivities,1,'Una solicitud explícita sí puede eliminar una parada flexible');
assert.deepEqual(replaced.itinerary[0].activities.map(a=>a.id),['replacement','old-museum']);
assert.equal(replaced.itinerary[0].removedActivityIds,undefined,'Los comandos de IA no se persisten como datos del usuario');
const refusedRemoval=mergeRefinedItinerary(progressive,removalProposal,'Mejorá los horarios');
assert.equal(refusedRemoval.removedActivities,0,'No se borran actividades si el usuario no lo autorizó');
assert.equal(refusedRemoval.itinerary[0].activities.some(a=>a.id==='old-square'),true);
const protectedRemoval=mergeRefinedItinerary(existing,[{id:'protect',title:'Colmar',removedActivityIds:['museum'],activities:[]}],'Quitá el Museo Unterlinden');
assert.equal(protectedRemoval.removedActivities,0,'No se elimina una reserva confirmada ni una actividad completada');
assert.ok(protectedRemoval.warnings.some(w=>w.includes('Museo Unterlinden')));
const validated=validateTrip({...trip,existingItinerary:context});
assert.equal(validated.existingItinerary,context,'El contexto llega al proveedor de forma validada');
assert.ok(JSON.stringify(geminiRequest(validated)).includes('Quiero mercados navideños'),'Gemini recibe el historial anterior');
assert.throws(()=>validateTrip({...trip,existingItinerary:'texto no estructurado'}),/contexto anterior/);
assert.throws(()=>validateTrip({...trip,existingItinerary:'x'.repeat(7501)}),/demasiado extenso/);
const entireDay={
 date:'2026-11-27',title:'Colmar renovado con mercados',advice:'Visitar primero el museo reservado, luego el mercado navideño.',removedActivityIds:['canal'],
 activities:[
  {refinesId:'museum',title:'Museo Unterlinden',description:'Nueva guía cultural del museo.',time:'09:00',minutes:60,location:'Colmar'},
  {title:'Mercado de Navidad de Colmar',description:'Puestos y comidas típicas.',time:'11:00',minutes:60,location:'Centro de Colmar'}
 ]
};
const providerDays=[{...entireDay,unchanged:false},...[28,29,30].map(date=>({date:`2026-11-${date}`,title:'Este texto no debe reemplazar el día anterior',advice:'Tarde libre.',unchanged:true,removedActivityIds:[],activities:[]}))];
const providerData={summary:'Ruta mejorada.',budgetNotes:'Comprobar entradas.',days:providerDays};
const originalFetch=globalThis.fetch;
let checkedRequest=false;
let submittedPayload='';
try{
 globalThis.fetch=async (_input:any,init:any)=>{
  submittedPayload=String(init.body);
  checkedRequest=true;
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(providerData)}]}}]});
 };
 const apiInput={...trip,existingItinerary:context,adjustment:'Reemplazá Pequeña Venecia por mercado y actualizá el itinerario'};
 const response=await geminiFreePlanner(new Request('https://viaja.pages.dev/api/plan',{method:'POST',body:JSON.stringify(apiInput)}),{GEMINI_API_KEY:'test-only'});
 assert.equal(response.status,200,'La API Gemini responde correctamente con revisiones estructuradas');
 const generated=await response.json() as Plan & {itinerary:Day[]};
 assert.equal(generated.itinerary[0].title,'Día 1 — 2026-11-27 · Colmar renovado con mercados');
 assert.equal(generated.itinerary[0].removedActivityIds?.[0],'canal');
 assert.equal(generated.itinerary[0].activities[0].refinesId,'museum');
 assert.equal(generated.itinerary[1].unchanged,true);
 const refinedByProvider=mergeRefinedItinerary(existing,generated.itinerary,apiInput.adjustment);
 assert.equal(refinedByProvider.removedActivities,1,'La eliminación explícita atraviesa API y fusión');
 assert.equal(refinedByProvider.itinerary[0].activities.some(a=>a.id==='canal'),false);
 assert.equal(refinedByProvider.itinerary[0].activities.find(a=>a.id==='museum')?.description,'Nueva guía cultural del museo.');
 assert.equal(refinedByProvider.itinerary[0].advice,'Visitar primero el museo reservado, luego el mercado navideño.');
 assert.equal(refinedByProvider.itinerary[1].title,existing[1].title,'Un día sin cambios no pierde su título ni su agenda');
 assert.equal(refinedByProvider.itinerary[1].activities[0].id,'cathedral');
 assert.equal(refinedByProvider.addedActivities,1);
}finally{globalThis.fetch=originalFetch}
assert.equal(checkedRequest,true,'La prueba ejercitó la llamada mock al proveedor');
assert.ok(submittedPayload.includes('removedActivityIds'),'La API de Gemini conoce las eliminaciones explícitas');
assert.ok(submittedPayload.includes('refinesId'),'La API conoce los IDs de actividades previas');
assert.ok(submittedPayload.includes('existingItinerary'),'La IA recibe la agenda guardada');
const compactPrompt=geminiRequest(validateTrip({...trip,existingItinerary:context})).systemInstruction.parts[0].text;
assert.ok(compactPrompt.includes('REVISIÓN INCREMENTAL BREVE'));
assert.ok(!compactPrompt.includes('Prepará un itinerario diario COMPLETO'),'Refinar no debe regenerar el plan completo y extenso');
assert.ok(compactPrompt.length<4300,'Instrucciones de refinamiento más concisas para bajar latencia');
assert.equal(GEMINI_TIMEOUT_MS,120000,'El proveedor tiene más tiempo que los antiguos 80 segundos');
const emptyEdit=normalizeGeminiIdeas({days:providerDays.map(d=>({...d,activities:[]}))},trip.start,4,'Equilibrado',true);
assert.equal(emptyEdit.days[1].unchanged,true);
assert.equal(emptyEdit.days[0].activities.length,0,'Una edición puede consistir solo en quitar una actividad anterior');
try{
 globalThis.fetch=async()=>{throw new DOMException('Test de timeout, sin red','TimeoutError')};
 const timeoutResponse=await geminiFreePlanner(new Request('https://viaja.pages.dev/api/plan',{method:'POST',body:JSON.stringify({...trip,existingItinerary:context})}),{GEMINI_API_KEY:'test-only'});
 assert.equal(timeoutResponse.status,502);
 assert.equal((await timeoutResponse.json() as {code:string}).code,'GEMINI_TIMEOUT');
}finally{globalThis.fetch=originalFetch}
console.log('Refinamiento iterativo: preservación de datos, cero duplicados, historial, privacidad y límite de contexto — OK');
