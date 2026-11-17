import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// MANUAL, IRREVERSIBLE and NEVER part of automatic CI or normal deployments.
// Only dedicated, newly created viaja-e2e-delete-* accounts are accepted.
if(process.env.VIAJA_E2E_DELETE_ALLOW!=='DELETE_QA_ACCOUNT')
 throw Error('Refusing destructive test without exact opt-in');

function required(name){
 const value=process.env[name]?.trim();
 if(!value)throw Error('Missing '+name);
 return value;
}
const supa='https://ovagewbmrirzrlvbvtbw.supabase.co';
const base=required('VIAJA_E2E_DELETE_PREVIEW_URL').replace(/\/$/,'');
assert.match(base,/^https:\/\/[a-z0-9-]+\.viaja\.pages\.dev$/,'Only a Cloudflare branch preview is allowed');
assert.notEqual(base,'https://viaja.pages.dev','Never run against the production frontend');
const publishable=required('VIAJA_E2E_PUBLISHABLE_KEY');
const account={
 a:{email:required('VIAJA_E2E_DELETE_USER_A_EMAIL'),password:required('VIAJA_E2E_DELETE_USER_A_PASSWORD')},
 b:{email:required('VIAJA_E2E_DELETE_USER_B_EMAIL'),password:required('VIAJA_E2E_DELETE_USER_B_PASSWORD')}
};
// Also accepts Gmail-style +aliases delivered to an inbox the tester owns.
const disposableEmail=/^(?:viaja-e2e-delete-[a-z0-9-]+|[a-z0-9._-]+\+viaja-e2e-delete-[a-z0-9-]+)@[^@]+\.[^@]+$/i;
for(const {email} of Object.values(account))
 assert.match(email,disposableEmail,'Only explicitly named disposable accounts');
assert.notEqual(account.a.email.toLowerCase(),account.b.email.toLowerCase());
assert.equal(required('VIAJA_E2E_DELETE_CONFIRM_EMAIL').toLowerCase(),account.a.email.toLowerCase(),
 'The exact email of the account to be deleted must be confirmed separately');

async function call(url,init={}){
 return fetch(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
}
async function json(response){
 const raw=await response.text();
 try{return raw?JSON.parse(raw):null}catch{return null}
}
async function login({email,password}){
 const r=await call(supa+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:publishable,'Content-Type':'application/json'},
  body:JSON.stringify({email,password})
 });
 assert.equal(r.status,200,'Disposable account cannot sign in');
 const data=await json(r);
 assert.equal(data.user?.email?.toLowerCase(),email.toLowerCase());
 assert.ok(data.access_token&&data.user?.id);
 const created=Date.parse(data.user.created_at||'');
 assert.ok(Number.isFinite(created)&&created<=Date.now()&&Date.now()-created<7*86400000,
  'Destructive QA requires a newly created account (less than 7 days old)');
 return {id:data.user.id,token:data.access_token};
}
function headers(user,body=false){return {apikey:publishable,Authorization:'Bearer '+user.token,
 ...(body?{'Content-Type':'application/json'}:{})}}
async function rest(user,path,method='GET',payload){
 const r=await call(supa+'/rest/v1/'+path,{method,headers:{...headers(user,Boolean(payload)),
  ...(method!=='GET'?{Prefer:'return=representation'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 return {status:r.status,body:await json(r)};
}
function fixturePdf(){
 // Sufficient for the private-upload magic and byte-size validations.
 return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
}
const file=fixturePdf();
async function upload(user,id){
 return call(base+'/api/private-documents/upload?kind=reservation&id='+id,{
  method:'POST',headers:{Origin:base,Authorization:'Bearer '+user.token,'Content-Type':'application/pdf'},body:file
 });
}
async function getFile(user,path){
 return call(supa+'/storage/v1/object/authenticated/reservation-pdfs/'+path,{headers:headers(user)});
}
async function removeFile(user,path){
 return call(supa+'/storage/v1/object/reservation-pdfs',{
  method:'DELETE',headers:headers(user,true),body:JSON.stringify({prefixes:[path]})
 });
}
async function ensureEmpty(user){
 for(const [table,field] of [['trips','user_id'],['reservation_files','owner_id'],
  ['trip_documents','uploaded_by'],['favorites','user_id']]){
  const result=await rest(user,table+'?select='+encodeURIComponent(field)+'&'+field+'=eq.'+user.id+'&limit=1');
  assert.equal(result.status,200,'Cannot verify an empty disposable account');
  assert.deepEqual(result.body,[],`Account has existing ${table}; do NOT delete it`);
 }
}
async function createFixture(user){
 const tripId=randomUUID(),reservationId=randomUUID();
 const path=user.id+'/'+reservationId+'/source.pdf';
 const fixture={tripId,reservationId,path};
 try{
  const trip=await rest(user,'trips?select=id','POST',{id:tripId,user_id:user.id,
   document:{title:'Viaja E2E disposable fixture',destination:'Roma',days:[]}});
  assert.equal(trip.status,201,'Could not create synthetic trip');
  const reservation=await rest(user,'reservation_files?select=id','POST',{
   id:reservationId,owner_id:user.id,filename:'e2e-only.pdf',storage_path:path,
   size_bytes:file.length,mime_type:'application/pdf',kind:'unclassified',title:'Synthetic fixture'
  });
  assert.equal(reservation.status,201,'Could not register synthetic PDF');
  const uploaded=await upload(user,reservationId);
  assert.equal(uploaded.status,201,'Could not upload synthetic PDF');
  return fixture;
 }catch(e){await cleanup(user,fixture);throw e}
}
async function cleanup(user,fixture){
 if(!fixture)return;
 try{await removeFile(user,fixture.path)}catch{}
 try{await rest(user,'reservation_files?id=eq.'+fixture.reservationId,'DELETE')}catch{}
 try{await rest(user,'trips?id=eq.'+fixture.tripId,'DELETE')}catch{}
}

let a,b,fixtureA,fixtureB,accountDeleted=false;
try{
 // No data-changing call before validating two independent disposable accounts.
 a=await login(account.a);b=await login(account.b);
 assert.notEqual(a.id,b.id);
 await ensureEmpty(a);await ensureEmpty(b);
 const invalid=await call(base+'/api/account/delete',{
  method:'POST',headers:{Origin:base,Authorization:'Bearer '+a.token,'Content-Type':'application/json'},
  body:JSON.stringify({confirmation:'NO',email:account.a.email})
 });
 assert.equal(invalid.status,400,'The preview delete route must reject wrong confirmation');
 fixtureA=await createFixture(a);
 fixtureB=await createFixture(b);
 const otherTrip=await rest(b,'trips?select=id&id=eq.'+fixtureA.tripId);
 assert.deepEqual(otherTrip.body,[],'B must not read A trips');

 const deletion=await call(base+'/api/account/delete',{
  method:'POST',headers:{Origin:base,Authorization:'Bearer '+a.token,'Content-Type':'application/json'},
  body:JSON.stringify({confirmation:'ELIMINAR MI CUENTA',email:account.a.email})
 });
 const result=await json(deletion);
 assert.equal(deletion.status,200,'Account deletion failed: '+(result?.code||deletion.status));
 assert.equal(result?.deleted,true);
 accountDeleted=true;

 const aLogin=await call(supa+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:publishable,'Content-Type':'application/json'},
  body:JSON.stringify(account.a)
 });
 assert.ok([400,401,403].includes(aLogin.status),'Deleted account still signs in');
 const bTrip=await rest(b,'trips?select=id&id=eq.'+fixtureB.tripId);
 assert.equal(bTrip.body?.[0]?.id,fixtureB.tripId,'B trip was removed');
 const bFile=await getFile(b,fixtureB.path);
 assert.equal(bFile.status,200,'B PDF was removed');
 assert.deepEqual(Buffer.from(await bFile.arrayBuffer()),file,'B PDF content changed');
 const aFile=await getFile(a,fixtureA.path);
 assert.ok([400,401,403,404].includes(aFile.status),'Deleted A PDF remains accessible');
 console.log('PASS disposable account A removed; B trip, reservation PDF and bytes retained');
}catch(e){
 console.error('FAIL account deletion E2E: '+(e instanceof Error?e.message:String(e)));
 process.exitCode=1;
}finally{
 if(b&&fixtureB)await cleanup(b,fixtureB);
 if(a&&fixtureA&&!accountDeleted)await cleanup(a,fixtureA);
 console.log('Synthetic fixture cleanup attempted. Deleted QA user A is never restored.');
}
