import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Node 22 strips types
import {publicTripSnapshot,communityTripToDraft} from '../lib/community-trips.ts';
import type {Plan} from '../lib/travel.ts';
const fake:Plan={
 id:'12345678-1234-4123-9123-123456789abc',
 kind:'draft',createdAt:'2026-10-31T12:00:00Z',
 trip:{destination:'Colmar, Francia',additionalDestinations:['Estrasburgo, Francia'],
  origin:'Barcelona, España',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:1234,
  pace:'Intenso',transport:'Sin coche',notes:'SECRET-HOTEL-ADDRESS · privado',
  links:'https://example.org/private-booking',adjustment:'SECRET-CODE-ABC',sources:['official']},
 itinerary:[
 {id:'private-day',title:'Día 1 · Colmar',advice:'Ver el mercado; SECRET-HOTEL-ADDRESS solo a modo de ejemplo',
  activities:[
   {id:'private-act',title:'Petite Venise',description:'Caminar por Petite Venise',time:'10:00',
    duration:'40 min',location:'Colmar',completed:true,estimatedCostEUR:999,
    price:'tarjeta 123',reservation:'Confirmada por mí',costNote:'SECRET-PAYMENT-NOTE'}
  ]},
 {id:'private-day2',title:'Día 2 · Estrasburgo',activities:[
  {id:'private-act2',title:'Catedral',description:'Visitar el exterior de la catedral',time:'12:00'}
 ]}
 ],
 expenses:[{id:'private-expense',date:'2026-11-27',label:'SECRET-ACCOUNT',category:'Alojamiento',amount:350}],
 photos:[{url:'https://example.org/photo.jpg',source:'x',title:'x',author:'x',license:'x'}],
 parts:[{text:'SECRET-PRIVATE-REPORT',annotations:[]}],sources:[{url:'https://example.org/secret',title:'Secret'}]
};
const shared=publicTripSnapshot(fake);
const exposed=JSON.stringify(shared);
for(const secret of ['SECRET-PAYMENT-NOTE','SECRET-ACCOUNT','SECRET-CODE-ABC','Barcelona, España','private-booking','SECRET-PRIVATE-REPORT','private-expense','private-act','2026-11-27','https://example.org/photo.jpg','tarjeta 123','Confirmada por mí','1234']){
 assert.ok(!exposed.includes(secret),'Private value must not leak: '+secret);
}
assert.equal(shared.destination,'Colmar, Francia');
assert.deepEqual(shared.content.route,['Colmar, Francia','Estrasburgo, Francia']);
assert.equal(shared.days_count,2);
assert.equal(shared.content.days[0].activities[0].title,'Petite Venise');
assert.deepEqual(Object.keys(shared.content.days[0].activities[0]).sort(),['description','duration','location','time','title']);
assert.ok(shared.content.days[0].advice?.includes('SECRET-HOTEL-ADDRESS'),
 'Day descriptions can contain user-written details; a consent preview is mandatory');
const fakeCommunity={id:'abcdef12-1234-4123-9123-abcdefabcdef',published_at:'2026-11-02',...shared};
const copy=communityTripToDraft(fakeCommunity);
assert.notEqual(copy.id,fake.id);
assert.equal(copy.trip.destination,'Colmar, Francia');
assert.equal(copy.trip.origin,'');
assert.equal(copy.trip.start,'');
assert.equal(copy.trip.end,'');
assert.equal(copy.trip.travelers,2);
assert.equal(copy.trip.budget,0);
assert.deepEqual(copy.expenses,[]);
assert.notEqual(copy.itinerary?.[0].activities[0].id,fake.itinerary?.[0].activities[0].id);
assert.equal(copy.itinerary?.[0].activities[0].title,'Petite Venise');
assert.deepEqual(copy.sources,[]);
assert.throws(()=>publicTripSnapshot({...fake,itinerary:[{id:'empty',title:'Empty',activities:[]}]}),/Agregá alguna actividad/);
assert.throws(()=>publicTripSnapshot({...fake,itinerary:Array.from({length:32},(_,i)=>({id:''+i,title:'Día '+i,activities:[]}))}),/1 y 31 días/);
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/202611020001_community_trip_publications.sql');
assert.match(sql,/create table public\.community_trips/);
assert.match(sql,/references public\.trips\(id\) on delete cascade/);
assert.match(sql,/enable row level security/);
assert.match(sql,/source_trip_id and t\.user_id=\(select auth\.uid\(\)\)/);
assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
assert.match(sql,/published=true/);
assert.match(sql,/jsonb_array_length/);
const app=read('app/page.tsx');
assert.ok(app.includes('description="Se compartirán el destino')&&app.includes('Revisá las descripciones'),
 'Publish requires explicit confirmation and warning about user-authored text');
assert.ok(app.includes('onUnpublish={setPendingUnpublish}'),'Must support revocation');
const supabase=read('lib/supabase-client.ts');
assert.ok(supabase.includes('publicTripSnapshot(plan)'),'Never write the original Plan into the public table');
assert.ok(supabase.includes('community_trips?select=')&&supabase.includes('published=eq.true'),'Public discovery filters by published');
console.log('PASS: community publication privacy, RLS policy presence, copy isolation and explicit consent');
