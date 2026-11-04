import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTravelPreferences,describeTravelPreferences,romaExamplePreferences,defaultTravelPreferences} from '../lib/travel-preferences.ts';
import {createEditorialStarter} from '../lib/guide-starter.ts';
import type {Trip} from '../lib/travel.ts';
const pref=romaExamplePreferences();
assert.equal(pref.durationDays,3);
assert.equal(pref.travelWith,'Pareja');
assert.equal(pref.budgetStyle,'Intermedio');
for(const key of ['history','food','nature'] as const)assert.equal(pref.interests[key],3);
assert.equal(pref.interests.nightlife,0);
assert.deepEqual(validateTravelPreferences(pref),pref);
const prompt=describeTravelPreferences(pref);
assert.match(prompt,/Historia y monumentos: 3\/3/);
assert.match(prompt,/Vida nocturna: 0\/3/);
assert.match(prompt,/NO presupone una cantidad de euros/);
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
assert.match(describeTravelPreferences(validTime),/día 1 12:00–18:00/);
const sample:Trip={destination:'Roma, Italia',origin:'',start:'',end:'',travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official'],preferences:pref};
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
for(const field of ['TripDateRange','DestinationSearch','interestOptions','dayTimes','onManual','onGenerate','onAdvanced','romaExamplePreferences'])assert.ok(form.includes(field),'Wizard missing '+field);
const gemini=readFileSync(new URL('../server/gemini-planner.ts',import.meta.url),'utf8');
const planner=readFileSync(new URL('../server/planner.ts',import.meta.url),'utf8');
for(const source of [gemini,planner])assert.ok(source.includes('describeTravelPreferences(trip.preferences)'), 'An AI provider does not receive structured travel preferences');
assert.match(planner,/validateTravelPreferences\(raw\.preferences\)/);
console.log('PASS guided planner: Roma defaults, structured validation, time ranges, editorial starter, wizard+AI integration');
