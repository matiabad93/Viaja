import assert from 'node:assert/strict';
// @ts-ignore native runner
import {timing,overlaps,googleRoute} from '../lib/agenda.ts';
const a={id:'a',title:'Louvre',description:'',time:'09:00',duration:'2 horas',completed:true};
assert.equal(timing(a).label,'11:00');assert.equal(overlaps(a,[a,{...a,id:'b',time:'10:30'}]),true);assert.equal(overlaps(a,[a,{...a,id:'b',time:'11:00'}]),false);assert.equal(JSON.parse(JSON.stringify(a)).completed,true);assert.equal(new URL(googleRoute([a,{...a,id:'b',title:'Seine'}],'Paris')!).searchParams.get('destination'),'Seine, Paris');console.log('5 agenda checks passed');
