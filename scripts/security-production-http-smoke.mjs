// Viaja production security smoke: requests are anonymous, bounded and non-mutating.
// The POST calls intentionally contain no credentials; they must fail before any data write.
import assert from 'node:assert/strict';

const base=new URL(process.env.VIAJA_SECURITY_BASE_URL||'https://viaja.pages.dev');
assert.equal(base.protocol,'https:','Production security smoke requires HTTPS');
const expectedOrigin=base.origin;
const timeout=15000;
const failures=[];
const statusLines=[];

async function probe(name,path,options,expectedStatus,{staticPage=false}={}){
 try{
  const response=await fetch(new URL(path,base),{
   redirect:'manual',
   cache:'no-store',
   signal:AbortSignal.timeout(timeout),
   ...options
  });
  assert.equal(response.status,expectedStatus,
   name+': expected HTTP '+expectedStatus+', received '+response.status);
  for(const [header,expected] of [
   ['x-content-type-options','nosniff'],
   ['x-frame-options','DENY'],
   ['referrer-policy','no-referrer']
  ])assert.equal(response.headers.get(header),expected,name+': missing '+header);
  const csp=response.headers.get('content-security-policy')||'';
  assert.match(csp,/frame-ancestors 'none'/,name+': missing anti-framing CSP');
  if(staticPage){
   assert.ok((response.headers.get('strict-transport-security')||'').includes('max-age='),
    name+': missing HSTS');
  }else{
   assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin',
    name+': missing CORP header');
   assert.match(response.headers.get('cache-control')||'',/no-store/i,
    name+': dynamic API response must not be cached');
  }
  const text=(await response.text()).slice(0,10000);
  assert.doesNotMatch(text,/sb_secret_[A-Za-z0-9]+|service_role\s*[:=]|SUPABASE_SECRET_KEY\s*[:=]/,
   name+': potential privileged credential disclosed in response');
  statusLines.push('PASS '+name+' HTTP '+response.status);
  return {response,text};
 }catch(error){
  failures.push(name+': '+(error instanceof Error?error.message:String(error)));
  return null;
 }
}

await probe('Static frontend','/',{method:'GET'},200,{staticPage:true});
const status=await probe('Anonymous API status','/api/status',{method:'GET'},200);
if(status){
 try{
  const statusData=JSON.parse(status.text);
  assert.equal(statusData.ready,false,'Unauthenticated status cannot report AI ready');
  assert.notEqual(statusData.admin,true,'Anonymous status must not be admin');
  statusLines.push('PASS anonymous API status is restricted');
 }catch(error){failures.push('Anonymous status body: '+(error instanceof Error?error.message:String(error)))}
}
await probe('Upload method guard','/api/private-documents/upload',{method:'GET'},405);
await probe('Upload rejects missing JWT',
 '/api/private-documents/upload?kind=reservation&id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',{
 method:'POST',
 headers:{Origin:expectedOrigin,'Content-Type':'application/pdf'},
 body:'%PDF-1.4\n%%EOF\n'
 },401);
const plan=await probe('AI request rejects anonymous',
 '/api/plan',{
 method:'POST',
 headers:{Origin:expectedOrigin,'Content-Type':'application/json'},
 body:JSON.stringify({destination:'Madrid'})
 },401);
if(!plan)console.warn('Anonymous AI denial may instead indicate disabled/unconfigured AI; review 503 and environment.');
for(const line of statusLines)console.log(line);
if(failures.length){
 for(const item of failures)console.error('FAIL '+item);
 process.exitCode=1;
}else console.log('PASS Viaja production anonymous security smoke ('+statusLines.length+' assertions)');
