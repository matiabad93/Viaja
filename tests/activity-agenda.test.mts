import assert from 'node:assert/strict';
import {activityKind,agendaSummary} from '../lib/activity-agenda.ts';
import {normalizeGeminiIdeas,geminiRequest} from '../server/gemini-planner.ts';
import {mergeRefinedItinerary} from '../lib/itinerary-refinement.ts';
import {timing} from '../lib/agenda.ts';

const item=(title:string,kind?:'visit'|'transfer'|'meal'|'break',duration='45 min')=>({id:title,title,kind,description:'Detalle orientativo',duration});
assert.equal(activityKind(item('Almuerzo en Colmar')),'meal');
assert.equal(activityKind(item('Cena de pareja')),'meal');
assert.equal(activityKind(item('Traslado en tren TER')),'transfer');
assert.equal(activityKind(item('Pausa en hotel')),'break');
assert.equal(activityKind(item('Visita al mercado navideño')),'visit');
assert.equal(activityKind({...item('Paseo'),kind:'transfer'}),'transfer','Explicit manual category has priority over title');

const agenda=[item('Museo', 'visit','2 horas'),item('Catedral','visit','90 min'),item('Mercado','visit','45 min'),item('Barrio','visit','45 min'),item('Tren 1','transfer','55 min'),item('Tren 2','transfer','55 min'),item('Desayuno','meal'),item('Almuerzo','meal'),item('Merienda','meal'),item('Cena','meal'),item('Descanso','break')];
const summary=agendaSummary(agenda);
assert.deepEqual([summary.visit,summary.transfer,summary.meal,summary.break,summary.total],[4,2,4,1,11]);
assert.equal(summary.pace,'Equilibrado','Logistics and meals do not make a day intense');
assert.equal(agendaSummary([item('Vuelo','transfer','180 min')]).pace,'En tránsito');
assert.equal(agendaSummary(agenda.slice(0,2)).pace,'Tranquilo');
assert.equal(timing({...item('Paseo','visit','1 h 30 min'),time:'10:00'}).label,'11:30','Mixed hour/minute durations agree with the schedule');

const scheduled=Array.from({length:15},(_,i)=>({title:'Bloque '+(i+1),description:'Parada real',time:String(6+Math.floor(i/3)).padStart(2,'0')+':'+String(i%3*20).padStart(2,'0'),minutes:15,location:'Colmar, Francia',kind:i%3===0?'meal':i%3===1?'transfer':'visit'}));
const mock={days:[{date:'2026-11-27',title:'Día completo',advice:'Organización por horarios.',activities:scheduled}]};
const normalized=normalizeGeminiIdeas(mock,'2026-11-27',1);
assert.equal(normalized.days[0].activities.length,15,'No silently discard the 13th or subsequent time blocks');
assert.equal(normalized.days[0].activities[0].kind,'meal');
assert.throws(()=>normalizeGeminiIdeas({days:[{...mock.days[0],activities:Array.from({length:25},(_,i)=>({...scheduled[i%15],title:'Parada extra '+i,time:String(6+Math.floor(i/3)).padStart(2,'0')+':'+String(i%3*20).padStart(2,'0') }))}]},'2026-11-27',1),/24 bloques/,'Excess should be surfaced, never truncated');

const base=[{id:'d1',title:'Día 1',activities:[{...item('Almuerzo','meal'),time:'12:00'}]},{id:'d2',title:'Día 2',activities:[]}];
const proposal=[{id:'d1',title:'Día 1',activities:[]},{id:'d2',title:'Día 2',activities:[{...item('Almuerzo','meal'),id:'new-meal',time:'12:00'}]}];
const merged=mergeRefinedItinerary(base,proposal,'agregá un almuerzo el segundo día');
assert.equal(merged.itinerary[1].activities.length,1,'Same meal may be scheduled on another day');

const aiTrip={destination:'Colmar',additionalDestinations:[],origin:'Barcelona',start:'2026-11-27',end:'2026-11-27',days:1,travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',notes:'',adjustment:'',sources:[],links:'',preferences:undefined};
const guidance=geminiRequest(aiTrip as unknown as Parameters<typeof geminiRequest>[0]);
const text=guidance.systemInstruction.parts[0].text;
assert.match(text,/kind="transfer"/);
assert.match(text,/NO cuentan como visitas/);
console.log('agenda inteligente: clasificaciones, ritmo, IA y repeticiones correctas');
