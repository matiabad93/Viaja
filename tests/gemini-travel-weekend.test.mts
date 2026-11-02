import assert from 'node:assert/strict';
// @ts-ignore native Node TS strip mode
import {normalizeGeminiIdeas,geminiFreePlanner} from '../server/gemini-planner.ts';
// @ts-ignore native Node TS strip mode
import {reviewItineraryFeasibility} from '../lib/trip-feasibility.ts';

const trip={
 destination:'Mulhouse, Francia',additionalDestinations:[],origin:'Barcelona, España',
 start:'2026-11-27',end:'2026-11-30',travelers:2,budget:0,pace:'Equilibrado',
 transport:'Sin coche',
 notes:'El viernes aterrizamos a las 18:30. Hotel 3 noches en Mulhouse. Queremos conocer Colmar, Estrasburgo y mercados navideños. El lunes sale el vuelo a las 06:30; recomendaciones de tren y lanzadera.',
 links:'',adjustment:'',sources:['official']
};
const threeDayReview=reviewItineraryFeasibility({...trip,end:'2026-11-29'});
assert.ok(threeDayReview.warnings.some(w=>w.includes('3 noches')&&w.includes('4 días')),
 'A 3-day form plus 3-night notes must flag the date mismatch before spending an AI request');
assert.ok(!reviewItineraryFeasibility(trip).warnings.some(w=>w.includes('3 noches')),
 '3 nights and 4 calendar days is a consistent trip');

const provider={
 summary:'Propuesta orientativa para un fin de semana de mercados. Verificar trenes y lanzaderas.',
 budgetNotes:'Costos de transporte pendientes de confirmar.',
 days:[
  {date:'2026-11-27',title:'Llegada y paseo corto en Mulhouse',activities:[
   {title:'Mercado navideño de Mulhouse',description:'Paseo nocturno orientativo después de llegar al hotel; confirmar horarios.',location:'Centro histórico, Mulhouse',time:'20:00',minutes:75}
  ]},
  {date:'2026-11-28',title:'Colmar y pueblo cercano',activities:[
   {title:'Tren regional',description:'Confirmar servicio y billete.',location:'Estación Mulhouse',time:'09:00',minutes:35,costCategory:'Transporte'},
   {title:'Centro histórico de Colmar',description:'Paseo a pie y mercado.',location:'Colmar',time:'10:30',minutes:120},
   {title:'Paseo después de cenar',description:'Actividad corta, sin horario confirmado.',location:'Mulhouse',time:'23:30',minutes:60},
  ]},
  {date:'2026-11-29',title:'Estrasburgo',activities:[
   {title:'Tren regional',description:'Otro tren, en otro día, no debe rechazarse por repetir el título.',location:'Estación Mulhouse',time:'09:00',minutes:60,costCategory:'Transporte'},
   {title:'Catedral de Estrasburgo',description:'Recorrer exterior y calles vecinas.',location:'Estrasburgo',time:'11:30',minutes:90},
   {title:'Paseo inválido',description:'No debe tumbar el plan.',location:'Estrasburgo',time:'25:00',minutes:30}
  ]},
  {date:'2026-11-30',title:'Vuelo muy temprano, sin turismo',activities:[]}
 ]
};
const normalized=normalizeGeminiIdeas(provider,trip.start,4);
assert.equal(normalized.days.length,4);
assert.equal(normalized.days[3].activities.length,0,'An early departure can have zero sightseeing activities');
assert.equal(normalized.days[1].activities.length,3);
assert.equal(normalized.days[1].activities[2].minutes,29,'Over-midnight schedules are truncated instead of crashing');
assert.equal(normalized.days[2].activities.length,2,'A single malformed activity does not discard other days');
assert.equal(normalized.days[1].activities[0].title,normalized.days[2].activities[0].title,'Repeated train titles across different dates are valid');
assert.ok(normalized.warnings.some(w=>w.includes('Se omitieron')),'User can see that a malformed activity was discarded');

const wrongDay=structuredClone(provider);
wrongDay.days[2].date='2026-11-31';
const repaired=normalizeGeminiIdeas(wrongDay,trip.start,4);
assert.equal(repaired.days[2].date,'2026-11-29','Use form dates, not invented Gemini dates');
assert.ok(repaired.warnings.some(w=>w.includes('fechas')),'Clearly disclose model date repair');

const oneMissing=structuredClone(provider);
oneMissing.days.pop();
const partiallyGenerated=normalizeGeminiIdeas(oneMissing,trip.start,4);
assert.equal(partiallyGenerated.days[3].activities.length,0,'Retain a blank missing departure day');
assert.ok(partiallyGenerated.warnings.some(w=>w.includes('no completó')));
assert.throws(()=>normalizeGeminiIdeas({summary:'no activities',days:provider.days.map(d=>({...d,activities:[]}))},trip.start,4),/ninguna actividad/,'Do not fabricate an entire empty itinerary');

const previousFetch=globalThis.fetch;
try{
 let systemPrompt='';
 globalThis.fetch=async(_url,init)=>{
  const request=JSON.parse(String(init?.body));
  systemPrompt=request.systemInstruction.parts[0].text;
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(provider)}]}}]});
 };
 const req=new Request('https://viaja.pages.dev/api/plan',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(trip)
 });
 const response=await geminiFreePlanner(req,{GEMINI_API_KEY:'test-key-not-live'});
 assert.equal(response.status,200,'The four-day Alsace travel scenario must not fail with GEMINI_INVALID_ITINERARY');
 const json=await response.json() as any;
 assert.equal(json.itinerary.length,4);
 assert.equal(json.itinerary[3].activities.length,0);
 assert.equal(json.itinerary[2].activities[0].title,'Tren regional');
 assert.ok(json.parts[0].text.includes('Observaciones de validación'),'Recovered schedule should disclose dropped items');
 assert.match(systemPrompt,/18:30/,'Arrival times explicitly govern the schedule');
 assert.match(systemPrompt,/06:30/,'Early departures explicitly govern the schedule');
 assert.match(systemPrompt,/3 noches.*4 fechas/,'Number of nights must not be confused with calendar days');
 console.log('PASS: four-day Alsace itinerary with three hotel nights, duplicate transfers, early departure and imperfect Gemini data');
}finally{globalThis.fetch=previousFetch;}
