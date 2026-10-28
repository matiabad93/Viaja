import assert from 'node:assert/strict';
// @ts-ignore Native TS runner
import {validateItinerary} from '../server/structured-itinerary.ts';
const day={date:'2026-12-01',limitation:'',activities:[{title:'Louvre',description:'Museo',time:'09:00',minutes:120,source:'https://www.louvre.fr/',location:'Paris'}]};
assert.equal(validateItinerary([day],'2026-12-01',1)[0].activities[0].endTime,'11:00');
assert.throws(()=>validateItinerary([day],'2026-12-01',4));
assert.throws(()=>validateItinerary([{...day,activities:[...day.activities,...day.activities]}],'2026-12-01',1));
assert.throws(()=>validateItinerary([{...day,activities:[]}],'2026-12-01',1));
assert.throws(()=>validateItinerary([{...day,activities:[{...day.activities[0],time:'25:00'}]}],'2026-12-01',1));
console.log('5 structured itinerary validation checks passed');
