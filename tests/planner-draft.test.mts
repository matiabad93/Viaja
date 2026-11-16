import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript stripping
import {PLANNER_DRAFT_KEY,hasMeaningfulPlannerDraft,readPlannerDraft,writePlannerDraft,clearPlannerDraft} from '../lib/planner-draft.ts';
import type {Trip} from '../lib/travel.ts';

const data=new Map<string,string>();
const storage={getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}};
const sample={destination:'Roma, Italia',additionalDestinations:[],origin:'',start:'',end:'',travelers:2,notes:'',sources:[],budget:0,pace:'Equilibrado',transport:'Sin coche',links:'',adjustment:''} as Trip;
assert.equal(readPlannerDraft(storage),null);
assert.equal(hasMeaningfulPlannerDraft({...sample,destination:''}),false);
assert.equal(writePlannerDraft(storage,sample,2),true);
assert.deepEqual(readPlannerDraft(storage)?.trip,sample);
assert.equal(readPlannerDraft(storage)?.step,2,'Wizard step survives a reload');
assert.equal(writePlannerDraft(storage,sample,4),false,'Out-of-range steps cannot be stored');
data.set(PLANNER_DRAFT_KEY,JSON.stringify({version:1,trip:{...sample,travelers:999},step:0}));
assert.equal(readPlannerDraft(storage),null,'Invalid cached traveler count is rejected');
data.set(PLANNER_DRAFT_KEY,'not valid json');
assert.equal(readPlannerDraft(storage),null,'Malformed draft cannot crash the planner');
writePlannerDraft(storage,sample,1);
clearPlannerDraft(storage);
assert.equal(readPlannerDraft(storage),null,'Creating a trip clears its pending wizard draft');
console.log('PASS: guided planner draft persistence, schema safety and reset');
