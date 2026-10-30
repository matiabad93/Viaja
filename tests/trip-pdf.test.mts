import assert from 'node:assert/strict';
// @ts-ignore Node's native TS runner
import {buildTripPdf} from '../lib/trip-pdf.ts';
const p={id:'demo',kind:'draft' as const,createdAt:'2026-10-29T10:00:00.000Z',trip:{destination:'Colmar, Francia',origin:'Barcelona, España',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:700,pace:'Tranquilo',transport:'Sin coche',notes:'Mercados navideños y paseos.',links:'',adjustment:'',sources:['official']},itinerary:[{id:'d1',title:'Centro histórico',activities:[{id:'a1',title:'Pequeña Venecia',description:'Paseo por canales y plazas con calma.',time:'10:00',duration:'90 min',location:'Colmar',price:'Por verificar'}]},{id:'d2',title:'Ribeauvillé',activities:[]},{id:'d3',title:'Eguisheim',activities:[]},{id:'d4',title:'Basilea',activities:[]}],expenses:[{id:'e1',date:'2026-11-27',label:'Hotel',category:'Alojamiento',amount:213}],sources:[{title:'Turismo oficial',url:'https://example.com/'}],parts:[{text:'Ideas orientativas. Horarios pendientes de verificación.',annotations:[]}]};
const bytes=buildTripPdf(p),pdf=Buffer.from(bytes).toString('latin1');
assert.ok(pdf.startsWith('%PDF-1.4'));
assert.ok(pdf.includes('/Type /Pages'));
assert.ok(pdf.includes('/Type /Page'));
assert.ok(pdf.includes('startxref'));
assert.ok(pdf.includes('Colmar, Francia'));
assert.ok(pdf.includes('Mercados navide'));
assert.ok(pdf.includes('Peque'));
assert.ok(pdf.includes('Hotel'));
assert.ok(pdf.includes('Turismo oficial'));
assert.ok(bytes.length>1500);
const xrefAt=Number(pdf.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
assert.ok(xrefAt>100);
assert.equal(pdf.slice(xrefAt,xrefAt+4),'xref');
console.log('PDF trip export: full itinerary, notes, expenses, sources and cross-reference passed');
