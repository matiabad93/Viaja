import assert from 'node:assert/strict';
// @ts-ignore native TS runner
import {calendarGeometry,PIXELS_PER_MINUTE,hourLabel} from '../lib/calendar-layout.ts';
// @ts-ignore native TS runner
import {mapRouteUrl,mapStops,mapBounds,pointValid} from '../lib/map-helpers.ts';
const train={id:'train',title:'Viaje en tren a San Remo',description:'',time:'09:00',duration:'2 horas',location:'San Remo'};
const later={id:'beach',title:'Playa',description:'',time:'12:00',duration:'90 min',location:'San Remo'};
const layout=calendarGeometry([train,later]);
const slot=layout.slots.find(s=>s.activity.id==='train')!;
assert.equal(slot.start,540);assert.equal(slot.end,660);
assert.equal(slot.height,120*PIXELS_PER_MINUTE);
assert.ok(Math.abs((slot.top+slot.height)-(660-layout.start)*PIXELS_PER_MINUTE)<0.001);
assert.equal(hourLabel(660),'11:00');
assert.equal(slot.conflict,false);
const clash=calendarGeometry([train,{...later,time:'10:00'}]);
assert.equal(clash.slots[0].conflict,true);
const points=mapStops([train,later],'Liguria, Italia');
assert.equal(points.length,2);
assert.equal(points[0].query,'San Remo, Liguria, Italia');
const multiple=[
 {id:'a',title:'Catedral Primada',description:'',location:'Catedral Primada, Toledo',time:'10:00'},
 {id:'b',title:'Alcázar',description:'',location:'Alcázar de Toledo',time:'12:00'},
 {id:'c',title:'Mirador del Valle',description:'',location:'Mirador del Valle',time:'15:00'}
];
const cityPoints=mapStops(multiple,'Madrid, España',['Toledo, España']);
assert.equal(cityPoints[0].query,'Catedral Primada, Toledo');
assert.equal(cityPoints[1].query,'Alcázar de Toledo');
assert.equal(cityPoints[2].query,'Mirador del Valle, Toledo, España');
assert.ok(!mapRouteUrl(multiple,'Madrid, España','walking',['Toledo, España'])?.includes('Madrid%2C+Espa%C3%B1a'),'Should never prepend Madrid to Toledo stops');

assert.ok(mapRouteUrl([train,later],'Italia','transit')?.includes('travelmode=transit'));
assert.deepEqual(mapBounds([[44.0,7.0],[43.0,8.0]]),[[43,7],[44,8]]);
assert.equal(pointValid(99,7),false);
console.log('Map and calendar: time-card geometry, overlap, route, location safeguards passed');
