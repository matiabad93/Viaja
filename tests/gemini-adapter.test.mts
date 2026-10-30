import assert from 'node:assert/strict';
// @ts-ignore Node native TypeScript
import {geminiFreePlanner} from '../server/gemini-planner.ts';
// @ts-ignore Node native TypeScript
import {validateTrip} from '../server/planner.ts';
const trip={destination:'Roma, Italia',origin:'Barcelona',start:'2026-11-14',end:'2026-11-15',travelers:2,budget:500,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official']};
const req=()=>new Request('https://viaja.pages.dev/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(trip)});
assert.equal(validateTrip({...trip,budget:''}).budget,0);
assert.equal(validateTrip({...trip,budget:null}).budget,0);
assert.throws(()=>validateTrip({...trip,travelers:0}),/viajeros/);
assert.equal(validateTrip(trip).budget,500);
const original=globalThis.fetch;
const success={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({summary:'Plan para dos días en Roma',budgetNotes:'Estimación sin precios actuales',days:[{date:'2026-11-14',title:'Centro histórico',activities:[{title:'Coliseo',description:'Visita sugerida',location:'Roma',time:'10:00',minutes:120}]},{date:'2026-11-15',title:'Recorrido tranquilo',activities:[{title:'Panteón',description:'Paseo orientativo',location:'Roma',time:'11:00',minutes:60}]}]})}]}}]};
try {
 let prompt='';
 globalThis.fetch=async(_url,init)=>{
  const payload=JSON.parse(String(init?.body));
  prompt=payload.systemInstruction.parts[0].text;
  return new Response(JSON.stringify(success),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const ok=await geminiFreePlanner(req(),{GEMINI_API_KEY:'test-placeholder'});
 assert.equal(ok.status,200);
 const itinerary=await ok.json() as any;
 assert.equal(itinerary.itinerary.length,2);
 assert.equal(itinerary.itinerary[0].activities[0].time,'10:00');
 assert.equal(itinerary.sources.length,0);
 assert.match(prompt,/4 a 6 paradas/, 'Full days should use enough relevant activities');
 assert.match(prompt,/Agrupá cada día por áreas próximas/, 'Nearby stops should be grouped to avoid backtracking');
 assert.match(prompt,/horarios de apertura confirmados/, 'No claims about live availability');
 const richDays=JSON.parse(JSON.stringify(success));
 const extra=richDays.candidates[0].content.parts[0];
 const result=JSON.parse(extra.text);
 result.days[0].activities=Array.from({length:7},(_,i)=>({title:'Atracción de Roma '+(i+1),description:'Visita cultural con recorridos por la misma zona y una pausa para caminar entre paradas.',location:'Centro de Roma',time:String(8+i*2).padStart(2,'0')+':00',minutes:60}));
 extra.text=JSON.stringify(result);
 globalThis.fetch=async()=>new Response(JSON.stringify(richDays),{status:200});
 const rich=await geminiFreePlanner(req(),{GEMINI_API_KEY:'test-placeholder'});
 assert.equal(rich.status,200,'A day can include seven meaningful nearby stops');
 assert.equal((await rich.json() as any).itinerary[0].activities.length,7);
 
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'unknown'}}),{status:400});
 const badRequest=await geminiFreePlanner(req(),{GEMINI_API_KEY:'test-placeholder'});
 assert.equal((await badRequest.json() as any).code,'GEMINI_REQUEST_REJECTED');
 globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]}),{status:200});
 const maxTokens=await geminiFreePlanner(req(),{GEMINI_API_KEY:'test-placeholder'});
 assert.equal((await maxTokens.json() as any).code,'GEMINI_MAX_TOKENS');
 globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]}),{status:200});
 const invalid=await geminiFreePlanner(req(),{GEMINI_API_KEY:'test-placeholder'});
 assert.equal((await invalid.json() as any).code,'GEMINI_INVALID_JSON');
 console.log('6 Gemini adapter checks passed');
} finally {globalThis.fetch=original;}
