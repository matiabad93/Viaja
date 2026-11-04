import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {privateDocumentUploadAPI} from '../server/private-document-upload.ts';

const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const outsider='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reservationId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const tripId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const tripDocId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const pdf=new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const secret='server-only-secret';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable',
 SUPABASE_SECRET_KEY:secret};
type Setup={userId?:string;recordOwner?:string;recordBytes?:number;allowTrip?:boolean;missing?:boolean};
function scenario(opts:Setup={}){
 const calls:string[]=[];
 const original=globalThis.fetch;
 globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const uri=String(input);calls.push(uri);
  if(uri.endsWith('/auth/v1/user'))
   return Response.json({id:opts.userId||user,role:'authenticated'});
  if(uri.includes('/rest/v1/reservation_files?'))
   return Response.json(opts.missing?[]:[{id:reservationId,owner_id:opts.recordOwner||user,
    storage_path:user+'/'+reservationId+'/source.pdf',
    size_bytes:opts.recordBytes??pdf.byteLength,mime_type:'application/pdf'}]);
  if(uri.includes('/rest/v1/trip_documents?'))
   return Response.json([{
    id:tripDocId,uploaded_by:user,trip_id:tripId,
    storage_path:tripId+'/'+tripDocId+'/document.png',
    size_bytes:png.byteLength,mime_type:'image/png'
   }]);
  if(uri.includes('/rest/v1/rpc/viaja_can_upload_trip_document'))
   return Response.json(opts.allowTrip??true);
  if(uri.includes('/storage/v1/object/')){
   const headers=new Headers(init?.headers);
   assert.equal(headers.get('apikey'),secret,'Privileged Storage must only use backend secret');
   assert.equal(headers.get('Authorization'),null,'Never forward the user JWT into secret Storage POST');
   assert.equal(headers.get('x-upsert'),'false','Do not allow file overwrites');
   return Response.json({path:'stored'},200);
  }
  throw Error('Unknown request '+uri);
 };
 return {calls,restore:()=>{globalThis.fetch=original}};
}
function request(kind:'reservation'|'trip',id:string,bytes:Uint8Array,mime:string,extras:Record<string,string>={}){
 return new Request('https://viaja.pages.dev/api/private-documents/upload?kind='+kind+'&id='+id,{
  method:'POST',
  headers:{Origin:'https://viaja.pages.dev',Authorization:'Bearer valid.mock.jwt','Content-Type':mime,...extras},
  body:bytes as Uint8Array<ArrayBuffer>
 });
}
const expectResponse=async(req:Request,expected:number)=>{
 const result=await privateDocumentUploadAPI(req,env);
 assert.equal(result.status,expected,await result.text().catch(()=>''));return result;
};
{
 const mock=scenario();
 try{
  const response=await expectResponse(request('reservation',reservationId,pdf,'application/pdf'),201);
  assert.equal((await response.json() as {uploaded:boolean}).uploaded,true);
  assert.ok(mock.calls.some(x=>x.includes('/storage/v1/object/reservation-pdfs/')));
 }finally{mock.restore()}
}
{
 const mock=scenario({userId:outsider});
 try{
  await expectResponse(request('reservation',reservationId,pdf,'application/pdf'),404);
  assert.ok(!mock.calls.some(x=>x.includes('/storage/v1/object/')),'Outsider cannot use Storage');
 }finally{mock.restore()}
}
{
 const mock=scenario({recordBytes:pdf.byteLength+1});
 try{
  await expectResponse(request('reservation',reservationId,pdf,'application/pdf'),422);
  assert.ok(!mock.calls.some(x=>x.includes('/storage/v1/object/')),'Declared byte spoof blocked');
 }finally{mock.restore()}
}
{
 const mock=scenario();
 try{
  await expectResponse(request('reservation',reservationId,new TextEncoder().encode('NOT A PDF'),'application/pdf'),422);
  assert.ok(!mock.calls.some(x=>x.includes('/storage/v1/object/')));
 }finally{mock.restore()}
}
{
 const mock=scenario();
 try{
  await expectResponse(request('reservation',reservationId,new Uint8Array(pdf.byteLength).fill(65),'application/pdf'),415);
  assert.ok(!mock.calls.some(x=>x.includes('/storage/v1/object/')));
 }finally{mock.restore()}
}
{
 const mock=scenario({allowTrip:false});
 try{
  await expectResponse(request('trip',tripDocId,png,'image/png'),403);
  assert.ok(!mock.calls.some(x=>x.includes('/storage/v1/object/')),'Revoked trip editor cannot upload');
 }finally{mock.restore()}
}
{
 const mock=scenario({allowTrip:true});
 try{await expectResponse(request('trip',tripDocId,png,'image/png'),201)}
 finally{mock.restore()}
}
{
 const mock=scenario();
 try{
  await expectResponse(request('reservation',reservationId,pdf,'image/png'),415);
  const badOrigin=request('reservation',reservationId,pdf,'application/pdf',{Origin:'https://evil.example'});
  await expectResponse(badOrigin,403);
  assert.equal(mock.calls.length,0,'Cross-origin and prohibited MIME requests denied before DB');
 }finally{mock.restore()}
}
{
 const mock=scenario();
 try{
  const denied=new Request('https://viaja.pages.dev/api/private-documents/upload?kind=reservation&id='+reservationId,{
   method:'POST',headers:{Origin:'https://viaja.pages.dev','Content-Type':'application/pdf'},body:pdf as Uint8Array<ArrayBuffer>
  });
  await expectResponse(denied,401);
  assert.equal(mock.calls.length,0);
 }finally{mock.restore()}
}
{
 const disabled=await privateDocumentUploadAPI(request('reservation',reservationId,pdf,'application/pdf'),{
  SUPABASE_PUBLISHABLE_KEY:'publishable'
 });
 assert.equal(disabled.status,503,'Missing server secret fails closed');
}
const sql=readFileSync(new URL('../supabase/migrations/202611040003_document_quotas_backend_upload.sql',import.meta.url),'utf8');
for(const phrase of [
 'private.viaja_enforce_document_quota','before insert on public.reservation_files',
 'before insert on public.trip_documents','viaja_document_upload_events',
 'pg_advisory_xact_lock','v_count >= 50','104857600','v_daily >= 30',
 'public.viaja_document_usage','public.viaja_can_upload_trip_document',
 'drop policy if exists viaja_reservation_object_upload',
 'drop policy if exists viaja_storage_doc_editor_insert'
])assert.ok(sql.includes(phrase),'Security contract missing '+phrase);
assert.ok(!/create\s+trigger\s+\S+\s+.*storage\.objects/i.test(sql),'Never modify internal Storage schema');
for(const path of ['../lib/reservation-library.ts','../lib/trip-documents.ts']){
 const c=readFileSync(new URL(path,import.meta.url),'utf8');
 assert.ok(c.includes('uploadViajaPrivateFile('),'Client must use server upload');
 assert.ok(!/await storageRequest\('object\/'\+(RESERVATION_PDF_BUCKET|TRIP_DOCUMENT_BUCKET)\+\s*'\/'\+.*\{\s*method:'POST'/s.test(c),'Client direct Storage POST prohibited');
}
console.log('PASS P1.2: verified secret-only upload, ownership, MIME, actual size, trip role, quota and RLS guardrails');
