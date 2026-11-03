import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore native TypeScript strip mode
import {geminiFreePlanner,normalizeGeminiIdeas} from '../server/gemini-planner.ts';
const trip={
 destination:'Mulhouse, Francia',additionalDestinations:[],origin:'Barcelona, España',
 start:'2026-11-27',end:'2026-11-30',travelers:2,budget:0,pace:'Intenso',
 transport:'Sin coche',notes:'Aeropuerto de Basilea viernes a las 18:30; 3 noches en Mulhouse. Mercados navideños, Colmar, Estrasburgo y un pueblo cercano. Vuelo de vuelta lunes a las 06:30. Preguntar por trenes y lanzaderas.',
 links:'',adjustment:'',sources:['official']
};
const description='Es un lugar importante del casco antiguo y tiene arquitectura característica de la zona. Conviene recorrer las fachadas y detenerse en las plazas próximas. Una visita breve permite entender cómo se relaciona con la historia local. La zona suele recorrerse caminando, pero conviene confirmar accesibilidad y transporte. Comprobá los horarios oficiales antes de reservar o planificar una entrada.';
const stops=Array.from({length:10},(_,i)=>({
 title:'Lugar turístico '+(i+1),
 description,location:'Centro histórico y alrededores, Colmar',
 time:String(8+i).padStart(2,'0')+':00',minutes:40
}));
const generated={
 summary:'Recorrido intenso por Alsacia sin coche. Confirmar conexiones y mercados.',
 budgetNotes:'Billetes y entradas por verificar, sin presupuestos reales.',
 days:[
  {date:'2026-11-27',title:'Llegada vespertina a Mulhouse',advice:'Trasladarse desde el aeropuerto a Mulhouse. Verificar la última conexión y dejar tiempo para registrarse en el alojamiento.',activities:[{title:'Paseo nocturno',description,location:'Mulhouse',time:'20:30',minutes:45}]},
  {date:'2026-11-28',title:'Colmar y mercados',advice:'Comenzar por el casco histórico, seguir a pie por los mercados y dejar la tarde para la zona del canal. Consultar trenes y lanzaderas oficiales. Reservar márgenes amplios para el regreso.',activities:stops},
  {date:'2026-11-29',title:'Estrasburgo',advice:'Agrupar la catedral, el casco antiguo y Petite France. Verificar el regreso a Mulhouse.',activities:stops.map((s,i)=>({...s,title:'Visita en Estrasburgo '+(i+1),location:'Estrasburgo'}))},
  {date:'2026-11-30',title:'Vuelo a las 06:30',advice:'Salir hacia el aeropuerto con antelación para el vuelo temprano. Revisar opciones de transporte nocturno, sin suponer que existe servicio.',activities:[]}
 ]
};
const withExtra=structuredClone(generated);
withExtra.days[1].activities.push({...stops[0],title:'Mirador extra en Colmar',time:'18:15',minutes:35});
const normalized=normalizeGeminiIdeas(withExtra,trip.start,4,'Intenso');
assert.equal(normalized.days[1].activities.length,11,'Intenso must no longer discard the ninth through eleventh activity');
assert.equal(normalized.days[1].activities[10].title,'Mirador extra en Colmar');
assert.equal(normalized.days[1].advice,generated.days[1].advice);
assert.equal(normalized.days[1].activities[0].description,description);
assert.equal(normalized.days[3].activities.length,0,'Early departure should not be filled with made-up activities');
const sparse=structuredClone(generated);
sparse.days[1].activities=stops.slice(0,2);
const reviewed=normalizeGeminiIdeas(sparse,trip.start,4,'Intenso');
assert.ok(reviewed.warnings.some(w=>w.includes('ritmo Intenso')||w.includes('El ritmo Intenso')),'Disclose underfilled intense days without faking stops');
const original=globalThis.fetch;
try{
 let prompt='';
 globalThis.fetch=async(_url,init)=>{
  const payload=JSON.parse(String(init?.body));
  prompt=payload.systemInstruction.parts[0].text;
  assert.equal(payload.generationConfig.responseMimeType,'application/json');
  assert.ok(payload.generationConfig.responseSchema.properties.days.items.properties.advice,'Gemini response schema supports daily guidance');
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(generated)}]}}]});
 };
 const req=new Request('https://viaja.pages.dev/api/plan',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(trip)
 });
 const response=await geminiFreePlanner(req,{GEMINI_API_KEY:'fake-test-key'});
 assert.equal(response.status,200);
 const result=await response.json() as any;
 assert.equal(result.itinerary.length,4);
 assert.equal(result.itinerary[1].activities.length,10,'Gemini itinerary retains 10 detailed stops');
 assert.equal(result.itinerary[1].activities[0].description,description,'Rich descriptions are persisted without summarization');
 assert.match(result.itinerary[1].advice,/lanzaderas oficiales/,'Daily transportation advice is displayed');
 assert.match(result.parts[0].text,/Cómo organizar este día/,'The long report includes daily travel guidance');
 assert.match(prompt,/7 a 10/,'Short intense trips target more than eight activities');
 assert.match(prompt,/4 a 6.*oraciones/,'Intense trip activities require real explanatory prose');
 assert.match(prompt,/SIN acceso a Internet|SIN acceso a Internet/i,'No false claims to current data');
 assert.match(prompt,/18:30/,'Arrival constraints are preserved');
 assert.match(prompt,/06:30/,'Return flight constraints are preserved');
 const detail=readFileSync(new URL('../components/trip-detail.tsx',import.meta.url),'utf8');
 assert.ok(detail.includes('selected.advice')&&detail.includes('day-practical-guide'),'Detail screen shows daily advice');
 assert.ok(detail.includes("plan.trip.pace==='Intenso'")&&detail.includes('activity-expanded-guide'),'Intense activity descriptions are visible without manually opening each one');
 console.log('PASS: 10 rich Alsace activities, daily logistics, 11-stop normalization, realistic arrival/departure, and visible detail UI');
}finally{globalThis.fetch=original;}
