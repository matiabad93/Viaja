import assert from 'node:assert/strict';
import {test} from 'node:test';
import {reservationWalletSummary,sortWalletReservations} from '../lib/reservation-wallet.ts';
import type {ReservationFile,ReservationDetails} from '../lib/reservation-library.ts';

const make = (id:string,details:Partial<ReservationDetails>,created_at='2026-11-01T00:00:00Z'):ReservationFile=>({
 id,owner_id:'00000000-0000-4000-8000-000000000001',filename:id+'.pdf',
 storage_path:'private/'+id,size_bytes:1200,mime_type:'application/pdf',kind:'flight',title:'Reserva '+id,
 details:{provider:'',bookingReference:'',flights:[],lodging:null,warnings:[],...details},
 linked_trip_id:null,reviewed_at:null,created_at,updated_at:created_at
});

const flight = (departureAt:string,origin='BCN',destination='EZE')=>({
 company:'Iberia',serviceNumber:'IB123',origin,destination,departureAt,
 arrivalAt:'',departureTimezone:'Europe/Madrid',arrivalTimezone:'America/Argentina/Buenos_Aires'
});

test('las reservas futuras aparecen primero, seguidas de las sin fecha y después las pasadas',()=>{
 const future=make('future',{flights:[flight('2026-11-20T10:30')]});
 const later=make('later',{flights:[flight('2026-12-10T09:00')]});
 const past=make('past',{flights:[flight('2026-10-12T14:00')]});
 const unknown=make('unknown',{bookingReference:'ABC123'});
 assert.deepEqual(sortWalletReservations([past,later,unknown,future],'2026-11-17').map(x=>x.id),
  ['future','later','unknown','past']);
});

test('en una reserva de múltiples vuelos se destaca el próximo tramo y su hora local',()=>{
 const r=make('multiple',{flights:[flight('2026-11-05T21:00','BCN','MAD'),flight('2026-11-18T08:35','MAD','EZE')],bookingReference:'ZX98'});
 const summary=reservationWalletSummary(r,'2026-11-17');
 assert.equal(summary.date,'2026-11-18');
 assert.equal(summary.time,'08:35');
 assert.equal(summary.route,'MAD → EZE');
 assert.equal(summary.reference,'ZX98');
 assert.equal(summary.dateLabel,'Salida');
});

test('el próximo check-in figura antes de un tramo anterior de vuelo',()=>{
 const r=make('mixed',{flights:[flight('2026-11-10T10:00')],lodging:{
  name:'Hotel Europa',address:'Calle del Mar 10',city:'Colmar',
  checkIn:'2026-11-19',checkOut:'2026-11-22',provider:'Booking'
 }});
 const summary=reservationWalletSummary(r,'2026-11-17');
 assert.equal(summary.dateLabel,'Check-in');
 assert.equal(summary.date,'2026-11-19');
 assert.equal(summary.route,'Hotel Europa · Colmar');
 assert.equal(summary.secondary,'Calle del Mar 10');
});

test('datos sin fechas correctas no producen errores ni inventan horarios',()=>{
 const r=make('invalid',{flights:[flight('2026-02-30T25:90')],bookingReference:'RES-14'});
 const summary=reservationWalletSummary(r,'2026-11-17');
 assert.equal(summary.date,'');
 assert.equal(summary.time,'');
 assert.equal(summary.route,'BCN → EZE');
 assert.equal(summary.reference,'RES-14');
});

test('no modifica el orden del array original',()=>{
 const a=make('a',{flights:[flight('2026-12-12T10:00')]});
 const b=make('b',{flights:[flight('2026-11-19T10:00')]});
 const arr=[a,b];
 assert.deepEqual(sortWalletReservations(arr,'2026-11-17').map(x=>x.id),['b','a']);
 assert.deepEqual(arr.map(x=>x.id),['a','b']);
});
