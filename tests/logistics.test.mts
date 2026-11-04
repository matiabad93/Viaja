import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localTimeToUtc,validateAccommodation,validateTransport,logisticsOf,tripDateWarning} from '../lib/trip-logistics.ts';
import {createAccommodationEvents,createTransportEvent,serializeCalendar} from '../lib/calendar-export.ts';
import {publicTripSnapshot} from '../lib/community-trips.ts';
import type {Accommodation,TransportSegment,Plan} from '../lib/travel.ts';

const accommodation:Accommodation={
 id:'a-test-1',name:'Hotel Noël',kind:'hotel',address:'5 Rue de Paris',city:'Colmar',
 checkIn:'2026-11-27',checkOut:'2026-11-30',checkInTime:'15:00',checkOutTime:'11:00',
 timezone:'Europe/Paris',confirmationCode:'VERY-PRIVATE-BOOKING-XYZ',status:'confirmed'
};
const transport:TransportSegment={
 id:'t-test-1',kind:'flight',company:'Vueling',serviceNumber:'VY1234',
 origin:'Barcelona',destination:'Basilea',departureAt:'2026-11-27T16:30',arrivalAt:'2026-11-27T18:20',
 departureTimezone:'Europe/Madrid',arrivalTimezone:'Europe/Paris',
 bookingReference:'SECRET-LOCATOR-ABC',status:'confirmed'
};
assert.deepEqual(validateAccommodation(accommodation),[]);
assert.deepEqual(validateTransport(transport),[]);
assert.equal(localTimeToUtc('2026-11-27T16:30','Europe/Madrid').toISOString(),'2026-11-27T15:30:00.000Z');
assert.equal(localTimeToUtc('2026-07-27T16:30','Europe/Madrid').toISOString(),'2026-07-27T14:30:00.000Z');
assert.equal(localTimeToUtc('2026-11-27T18:20','Europe/Paris').toISOString(),'2026-11-27T17:20:00.000Z');
assert.equal(localTimeToUtc('2026-03-29T01:30','Europe/Paris').toISOString(),'2026-03-29T00:30:00.000Z');
assert.throws(()=>localTimeToUtc('2026-03-29T02:30','Europe/Paris'),/no existe/);
assert.equal(localTimeToUtc('2026-10-25T02:30','Europe/Paris').toISOString(),'2026-10-25T00:30:00.000Z');
assert.ok(validateAccommodation({...accommodation,bookingUrl:'http://example.com'}).some(x=>/HTTPS/.test(x)));
assert.ok(validateAccommodation({...accommodation,checkOut:'2026-11-20'}).length);
assert.ok(validateTransport({...transport,arrivalAt:'2026-11-27T15:30'}).some(x=>/posterior/.test(x)));
assert.ok(validateTransport({...transport,arrivalTimezone:'Invalid/Timezone'}).length);
assert.ok(tripDateWarning('2026-11-26','2026-12-01','2026-11-27','2026-11-30'));
const aEvents=createAccommodationEvents(accommodation);
assert.equal(aEvents.length,2);
assert.equal(aEvents[0].start,'2026-11-27T14:00:00.000Z');
assert.equal(aEvents[1].start,'2026-11-30T10:00:00.000Z');
const tEvent=createTransportEvent(transport);
assert.equal(tEvent.start,'2026-11-27T15:30:00.000Z');
assert.equal(tEvent.end,'2026-11-27T17:20:00.000Z');
const ics=serializeCalendar([...aEvents,tEvent]);
assert.match(ics,/BEGIN:VCALENDAR\r\nVERSION:2.0/);
assert.match(ics,/DTSTART:20261127T153000Z/);
assert.match(ics,/DTEND:20261127T172000Z/);
assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,3);
assert.ok(ics.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75),'RFC 5545 lines must fold at 75 bytes');
assert.ok(!ics.includes('VERY-PRIVATE-BOOKING')&&!ics.includes('SECRET-LOCATOR'),'ICS must never expose booking codes');
assert.deepEqual(createAccommodationEvents({...accommodation,status:'cancelled'}),[]);
assert.throws(()=>createTransportEvent({...transport,status:'cancelled'}));
const allDay=createAccommodationEvents({...accommodation,checkInTime:'',checkOutTime:'',timezone:''});
assert.match(serializeCalendar(allDay),/DTSTART;VALUE=DATE:20261127/);
const plan:Plan={id:'p-1',kind:'draft',createdAt:new Date().toISOString(),
 trip:{destination:'Colmar',additionalDestinations:[],origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:300,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:[]},
 itinerary:[{id:'d1',title:'Centro',activities:[{id:'s1',title:'Mercado',description:'Pasear'}]}],
 logistics:{accommodations:[accommodation],transports:[transport]}};
assert.equal(logisticsOf({...plan,logistics:undefined}).accommodations.length,0,'Legacy trips must remain readable');
const publicData=publicTripSnapshot(plan);
assert.deepEqual(Object.keys(publicData).sort(),['content','days_count','destination','pace','title','transport']);
assert.ok(!JSON.stringify(publicData).includes('PRIVATE')&&!JSON.stringify(publicData).includes('SECRET'),'Public catalogue excludes all reservations');
const source=(file:string)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
assert.match(source('lib/supabase-client.ts'),/rpc\/viaja_save_shared_trip/);
assert.match(source('lib/supabase-client.ts'),/p_expected_version/);
assert.match(source('components/trip-detail.tsx'),/TripLogisticsPanel/);
assert.match(source('app/page.tsx'),/logistics:draft\.logistics/,'Regenerating with AI must preserve reservations');
console.log('PASS logistics: legacy compatibility, protected public catalogue, DST, ICS, CRUD architecture and version-checked saves');
