import assert from 'node:assert/strict';
import {accountDeletionAPI} from '../server/account-deletion.ts';

// Purely simulated HTTP: never calls Supabase, never deletes a real user.
const id='11111111-1111-4111-8111-111111111111';
const ownedTrip='22222222-2222-4222-8222-222222222222';
const sharedTrip='33333333-3333-4333-8333-333333333333';
const uploadedDoc='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const collaboratorDoc='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reservationId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'test-secret',SUPABASE_PUBLISHABLE_KEY:'test-publishable',VIAJA_ACCOUNT_DELETION_ENABLED:'true'};
const request=(body:unknown={confirmation:'ELIMINAR MI CUENTA',email:'user@example.com'},origin='https://viaja.pages.dev',authorization='Bearer test.jwt')=>
 new Request('https://viaja.pages.dev/api/account/delete',{method:'POST',headers:{Origin:origin,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body)});

type Scenario={stale?:boolean;storageFailure?:boolean;wrongEmail?:boolean;overflow?:boolean;invalidPath?:boolean;documentDeleteFailure?:boolean;authFailure?:boolean};
async function simulate(scenario:Scenario={}){
 const calls:Array<{path:string;method:string;body:string}> = [];
 const fake=async(input:RequestInfo|URL,options:RequestInit={}):Promise<Response>=>{
  const url=new URL(String(input)),method=options.method||'GET',body=String(options.body||'');
  calls.push({path:url.pathname+url.search,method,body});
  if(url.pathname==='/auth/v1/user')return Response.json({id,email:scenario.wrongEmail?'other@example.com':'user@example.com',
   last_sign_in_at:new Date(Date.now()-(scenario.stale?3600000:1000)).toISOString()});
  if(url.pathname==='/rest/v1/trips')return Response.json(scenario.overflow?Array.from({length:1000},()=>({id:ownedTrip})):[{id:ownedTrip}]);
  if(url.pathname==='/rest/v1/trip_documents'&&method==='GET'){
   if(url.searchParams.has('uploaded_by'))return Response.json([
    {id:uploadedDoc,storage_path:(scenario.invalidPath?'other-user/secret.pdf':sharedTrip+'/'+uploadedDoc+'/document.pdf'),trip_id:sharedTrip,uploaded_by:id,mime_type:'application/pdf'}
   ]);
   if(url.searchParams.has('trip_id'))return Response.json([
    {id:collaboratorDoc,storage_path:ownedTrip+'/'+collaboratorDoc+'/document.pdf',trip_id:ownedTrip,
     uploaded_by:'44444444-4444-4444-8444-444444444444',mime_type:'application/pdf'}
   ]);
  }
  if(url.pathname==='/rest/v1/reservation_files')return Response.json([
   {id:reservationId,storage_path:id+'/'+reservationId+'/source.pdf',owner_id:id}
  ]);
  if(url.pathname.startsWith('/storage/v1/object/'))return scenario.storageFailure
   ?Response.json({error:'storage unavailable'},{status:503}):Response.json([]);
  if(url.pathname==='/rest/v1/trip_documents'&&method==='DELETE')return scenario.documentDeleteFailure
   ?Response.json({error:'read-only'},{status:503}):new Response(null,{status:204});
  if(url.pathname==='/auth/v1/admin/users/'+id&&method==='DELETE')return scenario.authFailure
   ?Response.json({error:'auth service unavailable'},{status:503}):Response.json({});
  throw Error('Unexpected fake request '+method+' '+url.pathname+url.search);
 };
 const original=globalThis.fetch;
 globalThis.fetch=fake as typeof fetch;
 try{return {reply:await accountDeletionAPI(request(),env),calls}}
 finally{globalThis.fetch=original}
}

const originalFetch=globalThis.fetch;
globalThis.fetch=(async()=>{throw Error('Network must not be called')}) as typeof fetch;
try{
 const disabled=await accountDeletionAPI(request(),{...env,VIAJA_ACCOUNT_DELETION_ENABLED:'false'});
 assert.equal(disabled.status,503,'Production must fail closed when the deletion flag is off');
 assert.equal((await disabled.json() as {code?:string}).code,'ACCOUNT_DELETION_DISABLED');
 assert.equal((await accountDeletionAPI(request(),{...env,VIAJA_ACCOUNT_DELETION_ENABLED:undefined})).status,503);
 assert.equal((await accountDeletionAPI(request({},'https://evil.example'),env)).status,403,'Reject foreign origins');
 assert.equal((await accountDeletionAPI(request(undefined,undefined,'Bearer'),env)).status,401,'Require session JWT');
 assert.equal((await accountDeletionAPI(request({confirmation:'sí',email:'user@example.com'}),env)).status,400,'Require literal consent');
}finally{globalThis.fetch=originalFetch}

const stale=await simulate({stale:true});
assert.equal(stale.reply.status,409,'Require fresh sign-in');
assert.ok(!stale.calls.some(x=>x.method==='DELETE'),'Never delete anything with stale login');

const mismatch=await simulate({wrongEmail:true});
assert.equal(mismatch.reply.status,403,'Ensure account belongs to caller');
assert.ok(!mismatch.calls.some(x=>x.method==='DELETE'));

const over=await simulate({overflow:true});
assert.equal(over.reply.status,503,'Fail closed on truncated pagination');
assert.ok(!over.calls.some(x=>x.method==='DELETE'));

const invalid=await simulate({invalidPath:true});
assert.equal(invalid.reply.status,503,'Reject metadata pointing outside the owning trip');
assert.ok(!invalid.calls.some(x=>x.method==='DELETE'),'Never delete unverified paths');

const failed=await simulate({storageFailure:true});
assert.equal(failed.reply.status,503,'Never remove Auth user after storage failure');
assert.ok(!failed.calls.some(x=>x.path.startsWith('/auth/v1/admin/users/')));
assert.ok(!failed.calls.some(x=>x.path.startsWith('/rest/v1/trip_documents')&&x.method==='DELETE'));

const failedMetadata=await simulate({documentDeleteFailure:true});
assert.equal(failedMetadata.reply.status,503);
assert.ok(!failedMetadata.calls.some(x=>x.path.startsWith('/auth/v1/admin/users/')),
 'Never delete Auth if metadata cleanup failed');

const failedAuth=await simulate({authFailure:true});
assert.equal(failedAuth.reply.status,503,'Report partial failure when Auth is unavailable');
assert.ok(failedAuth.calls.some(x=>x.path.startsWith('/auth/v1/admin/users/')&&x.method==='DELETE'));

const ok=await simulate();
assert.equal(ok.reply.status,200);
assert.equal((await ok.reply.json() as {deleted?:boolean}).deleted,true);
const storage=ok.calls.filter(x=>x.path.startsWith('/storage/v1/object/'));
assert.equal(storage.length,2,'Remove objects in both private buckets');
assert.ok(storage.every(x=>x.method==='DELETE'));
const docs=storage.find(x=>x.path.endsWith('/trip-documents'))!;
assert.deepEqual(JSON.parse(docs.body).prefixes.sort(),[
 sharedTrip+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/document.pdf',
 ownedTrip+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/document.pdf'
].sort(),'Remove caller uploads and documents from their owned trips');
assert.ok(storage.some(x=>x.path.endsWith('/reservation-pdfs')&&JSON.parse(x.body).prefixes[0].startsWith(id+'/')));
assert.equal(ok.calls.at(-1)?.path,'/auth/v1/admin/users/'+id,'Auth deletion must be last');
assert.ok(!ok.calls.some(x=>x.path.includes('/auth/v1/admin/users/other')));

console.log('PASS account deletion: origins, JWT, recent login, explicit consent, scope and fail-closed cleanup');
