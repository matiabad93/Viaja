import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 RESERVATION_PDF_BUCKET,RESERVATION_MAX_PDF_BYTES,RESERVATION_URL_TTL_SECONDS,
 validateReservationPdf,reservationObjectPath,sanitizeReservationDetails,
} from '../lib/reservation-library.ts';
import {reservationExtractionAPI} from '../server/reservation-extraction.ts';

const asFile=(name:string,data:string|Uint8Array,mime='application/pdf')=>{
 const chunk:BlobPart=typeof data==='string'?data:new Uint8Array(data);
 return Object.assign(new Blob([chunk],{type:mime}),{name,lastModified:0}) as File;
};
assert.equal(RESERVATION_PDF_BUCKET,'reservation-pdfs');
assert.equal(RESERVATION_MAX_PDF_BYTES,10485760);
assert.equal(RESERVATION_URL_TTL_SECONDS,120);
assert.equal(await validateReservationPdf(asFile('Billete.pdf','%PDF-1.4\n%%EOF')),'Billete.pdf');
await assert.rejects(()=>validateReservationPdf(asFile('QR.png','%PDF-1.4')),/Solo se permiten archivos PDF/);
await assert.rejects(()=>validateReservationPdf(asFile('falso.pdf','<html>no pdf</html>')),/no es un PDF válido/);
await assert.rejects(()=>validateReservationPdf(asFile('vacio.pdf','')),/vacío/);
await assert.rejects(()=>validateReservationPdf(asFile('gigante.pdf',new Uint8Array(RESERVATION_MAX_PDF_BYTES+1))),/10 MB/);
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
assert.equal(reservationObjectPath(owner,id),owner+'/'+id+'/source.pdf');
assert.throws(()=>reservationObjectPath('../../x',id));
const clean=sanitizeReservationDetails({provider:' Booking ',bookingReference:' CODE\n123 ',
 flights:[{company:'Vueling',origin:'Barcelona',destination:'Basel',departureAt:'2026-11-27T16:35'}],
 lodging:{name:'Hotel',address:'',city:'Colmar',checkIn:'2026-11-27',checkOut:'2026-11-30'},
 warnings:['Revisar hora']});
assert.equal(clean.provider,'Booking');
assert.equal(clean.bookingReference,'CODE123');
assert.equal(clean.flights[0].origin,'Barcelona');
assert.equal(clean.lodging?.city,'Colmar');
assert.equal(clean.warnings.length,1);
const sql=readFileSync(new URL('../supabase/migrations/202611040002_reservation_library_private_pdf.sql',import.meta.url),'utf8');
for(const pattern of [
 /create table if not exists public\.reservation_files/i,
 /references public\.trips\(id\) on delete set null/i,
 /alter table public\.reservation_files enable row level security/i,
 /reservation-pdfs.*false,10485760/i,
 /array\['application\/pdf'\]/i,
 /viaja_reservation_owner_read/i,
 /viaja_reservation_owner_insert/i,
 /viaja_reservation_owner_edit/i,
 /viaja_reservation_owner_delete/i,
 /viaja_reservation_object_read/i,
 /viaja_reservation_object_upload/i,
 /viaja_reservation_object_delete/i,
 /p_user_id/i,
 /v_user>=3/i,
 /v_global>=60/i
])assert.match(sql,pattern);
assert.doesNotMatch(sql,/create policy[^\n]* for update on storage\.objects/i);
const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const secret='test-model-api-key';
const env={GEMINI_API_KEY:secret,GEMINI_KEY_ROTATED:'true',VIAJA_AI_ENABLED:'true',
 SUPABASE_SECRET_KEY:'server-secret',SUPABASE_PUBLISHABLE_KEY:'client-key',
 SUPABASE_URL:'https://fake.supabase.co'};
const request=(data:Record<string,unknown>)=>new Request('https://viaja.example/api/reservations/extract',{
 method:'POST',headers:{'origin':'https://viaja.example','Content-Type':'application/json',
  'Authorization':'Bearer test.jwt.value'},body:JSON.stringify(data)
});
let calls:string[]=[];
const original=globalThis.fetch;
try{
 globalThis.fetch=async (input,init)=>{
  const url=String(input);calls.push(url);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:owner,role:'authenticated'});
  if(url.includes('/rest/v1/reservation_files?'))return Response.json([{id,owner_id:owner,
   storage_path:owner+'/'+id+'/source.pdf',size_bytes:pdf.byteLength,mime_type:'application/pdf'}]);
  if(url.includes('/rpc/viaja_reserve_pdf_extract'))return Response.json({allowed:true});
  if(url.includes('/storage/v1/object/authenticated/'))return new Response(pdf,{status:200,headers:{'Content-Type':'application/pdf'}});
  if(url.includes('generativelanguage.googleapis.com')){
   const post=JSON.parse(String(init?.body||'{}')) as {contents:Array<{parts:Array<{inlineData?:{mimeType:string;data:string}}>}>};
   assert.equal(post.contents[0].parts[1].inlineData?.mimeType,'application/pdf');
   assert.ok((post.contents[0].parts[1].inlineData?.data||'').length>20);
   assert.ok(!JSON.stringify(post).includes('test-model-api-key'),'Do not put API key in body');
   return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({kind:'flight',title:'Billete Barcelona Basilea',
    details:{provider:'Vueling',bookingReference:'AB123',flights:[{company:'Vueling',origin:'BCN',destination:'BSL'}],lodging:null,warnings:[]}})}]}}]});
  }
  throw Error('Unexpected URL '+url);
 };
 let res=await reservationExtractionAPI(request({reservationId:id,consent:false}),env);
 assert.equal(res.status,400);assert.equal(calls.length,0,'No PDF calls without explicit consent');
 res=await reservationExtractionAPI(request({reservationId:id,consent:true}),env);
 assert.equal(res.status,200);
 const data=await res.json() as {kind:string;requiresConfirmation:boolean;details:{provider:string}};
 assert.equal(data.kind,'flight');assert.equal(data.requiresConfirmation,true);assert.equal(data.details.provider,'Vueling');
 assert.equal(calls.filter(x=>x.includes('generativelanguage')).length,1);
 calls=[];
 globalThis.fetch=async input=>{
  const url=String(input);calls.push(url);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:owner,role:'authenticated'});
  if(url.includes('reservation_files?'))return Response.json([]); // foreign record blocked by RLS
  throw Error('Should not call external model on unauthorized PDF');
 };
 res=await reservationExtractionAPI(request({reservationId:id,consent:true}),env);
 assert.equal(res.status,404);
 assert.equal(calls.filter(x=>x.includes('gemini')).length,0);
}finally{globalThis.fetch=original}
console.log('PASS reservations: PDF-only, strict validation, private RLS schema, opt-in Gemini, owner verification and quota contract');
