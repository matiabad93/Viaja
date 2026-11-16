import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript stripping
import {selectHomeTrip} from '../lib/home-journey.ts';
import type {Plan} from '../lib/travel.ts';

const sample=(id:string,start:string,end:string,createdAt='2026-10-01T12:00:00Z')=>
 ({id,createdAt,trip:{start,end}} as Plan);

const today='2026-11-16';
const past=sample('past','2026-10-03','2026-10-05');
const later=sample('later','2026-12-10','2026-12-13');
const soon=sample('soon','2026-11-20','2026-11-23');
const ongoing=sample('ongoing','2026-11-14','2026-11-19');
const draft=sample('draft','','','2026-11-15T16:00:00Z');
assert.equal(selectHomeTrip([],today),undefined);
assert.equal(selectHomeTrip([past,later,soon,draft],today)?.id,'soon','Nearest upcoming trip first');
assert.equal(selectHomeTrip([past,later,soon,ongoing],today)?.id,'ongoing','Ongoing trip first');
assert.equal(selectHomeTrip([past,draft],today)?.id,'draft','Newest undated draft before old finished trip');
assert.equal(selectHomeTrip([past],today)?.id,'past','Last completed trip when no upcoming trip');
assert.equal(selectHomeTrip([soon,later],today)?.id,'soon','Input order must not change priorities');
console.log('PASS: Home selects a useful trip to resume');
