import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTravelPreferences,describeTravelPreferences,defaultTravelPreferences,interestOptions,minimumTravelers,fixedTravelers,travelerGroupError,resolvedTravelPreferences} from '../lib/travel-preferences.ts';
import type {TravelPreferences} from '../lib/travel-preferences.ts';
import {validateTrip} from '../server/planner.ts';
import {geminiRequest} from '../server/gemini-planner.ts';
import {createEditorialStarter} from '../lib/guide-starter.ts';
import type {Trip} from '../lib/travel.ts';
// Roma is only a test fixture, not an example shown to the user.
const pref:TravelPreferences={...defaultTravelPreferences(),durationDays:3,
 interests:{...defaultTravelPreferences().interests,history:3,food:3,nature:3,nightlife:0,football:3,sports:2}};
assert.equal(pref.durationDays,3);
assert.equal(pref.travelWith,'Pareja');
assert.equal(pref.budgetStyle,'Intermedio');
for(const key of ['history','food','nature'] as const)assert.equal(pref.interests[key],3);
assert.equal(pref.interests.nightlife,0);
assert.equal(pref.interests.football,3);
assert.equal(pref.interests.sports,2);
assert.ok(interestOptions.some(i=>i.id==='football'));
assert.ok(interestOptions.some(i=>i.id==='sports'));
assert.ok(interestOptions.some(i=>i.id==='events'));
assert.ok(interestOptions.some(i=>i.id==='family'));
assert.equal(fixedTravelers('Solo'),1);
assert.equal(fixedTravelers('Pareja'),2);
assert.equal(fixedTravelers('Amigos'),undefined);
assert.equal(minimumTravelers('Familia'),3);
assert.equal(minimumTravelers('Amigos'),2);
assert.equal(travelerGroupError('Solo',1),undefined);
assert.equal(travelerGroupError('Pareja',2),undefined);
assert.equal(travelerGroupError('Amigos',2),undefined);
assert.equal(travelerGroupError('Familia',3),undefined);
assert.match(travelerGroupError('Solo',10)||'',/solo/);
assert.match(travelerGroupError('Pareja',10)||'',/dos/);
assert.match(travelerGroupError('Familia',2)||'',/3 a 12/);
assert.match(travelerGroupError('Amigos',1)||'',/2 a 12/);
assert.deepEqual(validateTravelPreferences(pref),pref);
const prompt=describeTravelPreferences(pref);
assert.match(prompt,/Historia y monumentos: 3\/3/);
assert.match(prompt,/Vida nocturna: 0\/3/);
assert.match(prompt,/Fútbol: 3\/3/);
assert.match(prompt,/Deportes: 2\/3/);
assert.match(prompt,/0=evitar/);
assert.match(prompt,/NUNCA inventar fechas de partidos/);
assert.match(prompt,/NO presupone una cantidad de euros/);
const oldInterestState={history:3,food:2,nature:1,culture:1,relax:2,nightlife:0,shopping:1,adventure:1};
const oldValidated=validateTravelPreferences({...pref,interests:oldInterestState});
assert.equal(oldValidated?.interests.nightlife,0,'Keep 0/3 when upgrading old saved trips');
assert.equal(oldValidated?.interests.football,defaultTravelPreferences().interests.football);
assert.equal(resolvedTravelPreferences({...pref,interests:oldInterestState} as any).interests.sports,1);
const defaultPref=defaultTravelPreferences();
assert.equal(defaultPref.durationDays,3);
assert.ok(defaultPref.interests.food>=1);
for(const invalid of [
 {...pref,travelWith:'Supervisor'},
 {...pref,budgetStyle:'unlimited money'},
 {...pref,durationDays:999},
 {...pref,interests:{...pref.interests,nightlife:4}},
 {...pref,interests:{...pref.interests,history:-1}},
 {...pref,dayTimes:[{start:'22:00',end:'08:00'}]},
 {...pref,dayTimes:[{start:'24:00',end:'25:00'}]}
])assert.throws(()=>validateTravelPreferences(invalid));
const validTime={...pref,dayTimes:[{start:'12:00',end:'18:00'},{start:'10:00',end:'18:00'}]};
assert.deepEqual(validateTravelPreferences(validTime),validTime);
assert.throws(()=>validateTravelPreferences({...pref,interests:{...pref.interests,football:'3'}}));
assert.match(describeTravelPreferences(validTime),/día 1 12:00–18:00/);
const sample:Trip={destination:'Roma, Italia',origin:'',start:'',end:'',travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official'],preferences:pref};
const validAI={...sample,start:'2026-12-15',end:'2026-12-17'};
const parsed=validateTrip(validAI);
assert.equal(parsed.preferences?.interests.football,3);
assert.throws(()=>validateTrip({...validAI,travelers:10,preferences:{...pref,travelWith:'Solo'}}),/viajás solo/);
assert.throws(()=>validateTrip({...validAI,travelers:3,preferences:{...pref,travelWith:'Pareja'}}),/dos personas/);
assert.throws(()=>validateTrip({...validAI,travelers:2,preferences:{...pref,travelWith:'Familia'}}),/3 a 12/);
const request=geminiRequest(parsed);
const guidance=request.systemInstruction.parts[0].text;
assert.match(guidance,/Fútbol: 3\/3/);
assert.match(guidance,/Vida nocturna: 0\/3/);
assert.match(guidance,/Prioridades más altas/);
const supplied=JSON.parse(request.contents[0].parts[0].text);
assert.equal(supplied.preferences.interests.football,3);
assert.equal(supplied.preferences.interests.nightlife,0);
assert.equal(supplied.travelers,2);
const editor=createEditorialStarter(sample);
assert.ok(editor?.length===3,'Undated Roma wizard must create three editorial days');
assert.ok(editor.every(d=>d.activities.length>0),'Rome day should contain useful activity suggestions');
assert.ok(editor[0].activities.some(a=>/coliseo/i.test(a.description)),'Rome should retain the Coliseum');
assert.equal(createEditorialStarter({...sample,destination:'Destino sin guía'}),null);
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
assert.match(page,/plannerMode==='guided'\?<GuidedPlanner/);
assert.match(page,/onAdvanced=\{\(\)=>/);
assert.match(page,/createEditorialStarter\(trip\)/);
assert.match(page,/trip\.preferences\?\.durationDays\|\|3/);
assert.match(page,/onGenerate=\{\(\)=>generate/);
const form=readFileSync(new URL('../components/guided-planner.tsx',import.meta.url),'utf8');
for(const field of ['TripDateRange','DestinationSearch','interestOptions','dayTimes','onManual','onGenerate','onAdvanced','fixedTravelers','minimumTravelers'])assert.ok(form.includes(field),'Wizard missing '+field);
const gemini=readFileSync(new URL('../server/gemini-planner.ts',import.meta.url),'utf8');
const planner=readFileSync(new URL('../server/planner.ts',import.meta.url),'utf8');
for(const source of [gemini,planner])assert.ok(source.includes('describeTravelPreferences(trip.preferences)'), 'An AI provider does not receive structured travel preferences');
assert.match(planner,/validateTravelPreferences\(raw\.preferences\)/);
assert.ok(!form.includes('Probar ejemplo: Roma'),'No visible Roma preset');
assert.ok(!form.includes('setRome'),'No hidden Roma action');
assert.ok(form.includes('update({preferences:pref})'),'Guided defaults must be saved even if no slider is touched');
console.log('PASS guided planner: group rules, sports/football preferences, old drafts, AI payload, editorial starter, wizard');
