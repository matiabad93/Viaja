import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
// Opt-in production test: two dedicated accounts and one disposable synthetic PDF.
const base='https://viaja.pages.dev';
const supa='https://ovagewbmrirzrlvbvtbw.supabase.co';
if(process.env.VIAJA_E2E_ALLOW_PRODUCTION!=='yes')throw Error('Explicit opt-in required');
function env(name){const x=process.env[name]?.trim();if(!x)throw Error('Missing E2E setting '+name);return x}
const key=env('VIAJA_E2E_PUBLISHABLE_KEY');
const emails=[env('VIAJA_E2E_USER_A_EMAIL'),env('VIAJA_E2E_USER_B_EMAIL')];
const passwords=[env('VIAJA_E2E_USER_A_PASSWORD'),env('VIAJA_E2E_USER_B_PASSWORD')];
for(const email of emails)assert.match(email,/^viaja-e2e-[^@]+@[^@]+\.[^@]+$/i);
assert.notEqual(emails[0].toLowerCase(),emails[1].toLowerCase());
function pdfFixture(){
 const parts=['%PDF-1.4\n'],offsets=[];
 const content='BT /F1 12 Tf 40 130 Td (Viaja synthetic test only) Tj ET\n';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 240] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'endstream'
 ];
 for(let i=0;i<objects.length;i++){
  offsets.push(Buffer.byteLength(parts.join('')));
  parts.push((i+1)+' 0 obj\n'+objects[i]+'\nendobj\n');
 }
 const start=Buffer.byteLength(parts.join(''));
 parts.push('xref\n0 6\n0000000000 65535 f \n');
 for(const offset of offsets)parts.push(String(offset).padStart(10,'0')+' 00000 n \n');
 parts.push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
 return Buffer.from(parts.join(''));
}
const file=pdfFixture();
const id=randomUUID(),pass=[];
function ok(label){pass.push(label);console.log('PASS '+label)}
async function call(url,opts={}){return fetch(url,{...opts,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)})}
async function data(res){const t=await res.text();return t?JSON.parse(t):null}
async function login(email,password){
 const r=await call(supa+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 assert.equal(r.status,200,'Dedicated E2E sign-in failed');
 const j=await data(r);assert.equal(j.user?.email?.toLowerCase(),email.toLowerCase());
 assert.ok(j.access_token&&j.user?.id);return {id:j.user.id,token:j.access_token};
}
function auth(u,ctype){return {apikey:key,Authorization:'Bearer '+u.token,...(ctype?{'Content-Type':ctype}:{})}}
async function rest(u,route,method='GET',payload){
 const r=await call(supa+'/rest/v1/'+route,{method,headers:{...auth(u,payload?'application/json':null),...(method!=='GET'?{Prefer:'return=representation'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 return {status:r.status,value:await data(r)};
}
async function storage(u,route,method='GET',payload){
 return call(supa+'/storage/v1/'+route,{method,headers:auth(u,payload?'application/json':null),...(payload?{body:JSON.stringify(payload)}:{})});
}
function denied(r,label){assert.ok([400,401,403,404].includes(r.status),label+' HTTP '+r.status);ok(label)}
let a,path,registered=false,deleted=false;
try{
 a=await login(emails[0],passwords[0]);const b=await login(emails[1],passwords[1]);
 assert.notEqual(a.id,b.id);ok('Two independent verified accounts');
 path=a.id+'/'+id+'/source.pdf';
 const record={id,owner_id:a.id,filename:'viaja-e2e.pdf',storage_path:path,size_bytes:file.byteLength,mime_type:'application/pdf',kind:'unclassified',title:'Synthetic fixture'};
 const created=await rest(a,'reservation_files?select=id','POST',record);
 assert.equal(created.status,201);assert.equal(created.value?.[0]?.id,id);registered=true;ok('Owner registers private PDF');
 const foreignList=await rest(b,'reservation_files?select=id&id=eq.'+id);
 assert.equal(foreignList.status,200);assert.deepEqual(foreignList.value,[]);ok('Other user cannot list PDF');
 const foreignUpload=await call(base+'/api/private-documents/upload?kind=reservation&id='+id,{method:'POST',headers:{Origin:base,Authorization:'Bearer '+b.token,'Content-Type':'application/pdf'},body:file});
 denied(foreignUpload,'Other user cannot upload PDF');
 const uploaded=await call(base+'/api/private-documents/upload?kind=reservation&id='+id,{method:'POST',headers:{Origin:base,Authorization:'Bearer '+a.token,'Content-Type':'application/pdf'},body:file});
 assert.equal(uploaded.status,201,'Owner PDF upload HTTP '+uploaded.status);ok('Owner uploads through Cloudflare');
 const signed=await storage(a,'object/sign/reservation-pdfs/'+path,'POST',{expiresIn:120});
 assert.equal(signed.status,200);const signedData=await data(signed);
 const signedPath=signedData?.signedURL||signedData?.signedUrl;
 assert.ok(signedPath?.startsWith('/object/sign/'));
 const signedUrl=new URL(supa+'/storage/v1'+signedPath);assert.equal(signedUrl.origin,new URL(supa).origin);
 ok('Owner signs private PDF (120s)');
 const download=await call(signedUrl.toString());assert.equal(download.status,200);
 assert.ok(Buffer.from(await download.arrayBuffer()).equals(file));ok('Signed PDF bytes match synthetic original');
 const forbiddenSign=await storage(b,'object/sign/reservation-pdfs/'+path,'POST',{expiresIn:120});
 denied(forbiddenSign,'Other user cannot sign PDF');
 const forbiddenGet=await storage(b,'object/authenticated/reservation-pdfs/'+path);
 denied(forbiddenGet,'Other user cannot download PDF');
 const forbiddenEdit=await rest(b,'reservation_files?id=eq.'+id+'&select=id','PATCH',{title:'unauthorized'});
 assert.ok([200,204].includes(forbiddenEdit.status));assert.deepEqual(forbiddenEdit.value||[],[]);ok('Other user cannot update metadata');
 const forbiddenDelete=await rest(b,'reservation_files?id=eq.'+id+'&select=id','DELETE');
 assert.ok([200,204].includes(forbiddenDelete.status));assert.deepEqual(forbiddenDelete.value||[],[]);ok('Other user cannot delete metadata');
 const stillThere=await rest(a,'reservation_files?select=id,title&id=eq.'+id);
 assert.equal(stillThere.value?.[0]?.title,record.title);ok('Owner PDF survives foreign attacks');
 const rmFile=await storage(a,'object/reservation-pdfs','DELETE',{prefixes:[path]});assert.ok(rmFile.ok,'Owner Storage delete failed');
 const rmRow=await rest(a,'reservation_files?id=eq.'+id+'&select=id','DELETE');
 assert.ok([200,204].includes(rmRow.status));assert.equal(rmRow.value?.length,1);deleted=true;
 ok('Owner deletes PDF and metadata');
 const gone=await rest(a,'reservation_files?select=id&id=eq.'+id);
 assert.deepEqual(gone.value,[]);ok('Deleted PDF no longer in metadata');
 console.log('PASS two-account PDF production E2E: '+pass.length+' checks');
}catch(error){console.error('FAIL two-account PDF E2E: '+(error instanceof Error?error.message:String(error)));process.exitCode=1}
finally{
 if(registered&&!deleted&&a&&path){
  try{await storage(a,'object/reservation-pdfs','DELETE',{prefixes:[path]})}catch{console.error('WARN cleanup Storage')}
  try{await rest(a,'reservation_files?id=eq.'+id+'&select=id','DELETE')}catch{console.error('WARN cleanup metadata')}
  console.log('Interrupted fixture cleanup attempted');
 }
}
