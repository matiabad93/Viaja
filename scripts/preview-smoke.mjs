/**
 * Viaja Preview HTTP smoke test.
 * Does not authenticate, spend AI quota, or log secrets.
 * Usage: node scripts/preview-smoke.mjs
 */
import assert from 'node:assert/strict';

const origin=(process.env.VIAJA_PREVIEW_URL||'https://feat-v1-production-release-p.viaja.pages.dev').replace(/\/$/,'');
async function get(path,options={}){
 const url=new URL(path,origin);
 const response=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'follow',...options});
 const body=await response.text();
 console.log(`[preview] ${url.pathname}: HTTP ${response.status}; content-type=${response.headers.get('content-type')||'unknown'}; bytes=${body.length}`);
 return {response,body};
}
function ok(condition,reason){assert.ok(condition,reason);console.log('PASS '+reason)}
const home=await get('/');
ok(home.response.status===200,'Preview homepage returns HTTP 200');
ok(home.body.includes('Viaja')&&home.body.includes('id="root"'),'Preview contains the Viaja app mount point');
const script=home.body.match(/<script[^>]+src=["']([^"']+\.js)["']/i)?.[1];
ok(Boolean(script),'Preview references a compiled JavaScript entry point');
const asset=await get(script);
ok(asset.response.status===200,'Preview serves its compiled JavaScript asset');
ok((asset.response.headers.get('content-type')||'').includes('javascript'),'Compiled asset is served as JavaScript');
const manifest=await get('/manifest.webmanifest');
ok(manifest.response.status===200,'PWA manifest is available');
try{
 const parsed=JSON.parse(manifest.body);
 ok(typeof parsed.name==='string'&&parsed.name.toLowerCase().includes('viaja'),'PWA manifest belongs to Viaja');
}catch(e){if(e?.name==='AssertionError')throw e;throw Error('PWA manifest is not valid JSON')}
const api=await get('/api/status');
ok(api.response.status===200,'Pages Functions /api/status is available');
let status;try{status=JSON.parse(api.body)}catch{throw Error('/api/status returned non-JSON content')}
ok(typeof status.ready==='boolean','AI status API has a Boolean readiness flag');
console.log('[preview] AI readiness (anonymous): '+status.ready+'; provider='+(status.provider??'none')+'; reason='+(status.reason??'none'));
ok(status.ready===false,'Unauthenticated visitors cannot use AI');
const forbidden=await get('/api/plan',{method:'GET'});
ok(forbidden.response.status===405,'GET /api/plan is rejected');
const invalidOrigin=await get('/api/plan',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});
ok(invalidOrigin.response.status===403,'Cross-origin AI request is rejected before calling a provider');
const anonymousPlan=await get('/api/plan',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});
ok(anonymousPlan.response.status===401,'Unauthenticated AI request is rejected before quota/provider invocation');
// Verify real, unmocked geocoding responses after the branch deployment lands.
async function realCityQuery(q,valid){
 let last='No response';
 for(let attempt=1;attempt<=5;attempt++){
  try{
   const result=await get('/api/cities?'+new URLSearchParams({q}));
   const body=JSON.parse(result.body);
   if(result.response.ok&&valid(body))return body;
   last='HTTP '+result.response.status+'; mode='+(body.mode||'none')+'; count='+(body.cities?.length||0);
  }catch(e){last=String(e)}
  if(attempt<5)await new Promise(resolve=>setTimeout(resolve,3500));
 }
 throw Error('Live '+q+' geocoding failed: '+last);
}
const italianCities=await realCityQuery('Italia',body=>body.mode==='country'&&body.country?.code==='IT'&&body.cities?.length>=2&&body.cities.every(city=>city.countryCode==='IT'&&city.name!=='Italia'));
ok(italianCities.cities[0].population>=italianCities.cities[1].population,'Italy returns genuine major cities ordered by population');
const rosario=await realCityQuery('Rosario',body=>body.mode==='city'&&body.cities?.some(city=>city.country==='Argentina'&&city.name==='Rosario'&&/Santa Fe/i.test(city.region)));
ok(rosario.cities.some(city=>city.name==='Rosario'&&city.country==='Argentina'&&/Santa Fe/i.test(city.region)),'Rosario shows Santa Fe, Argentina in real geocoder data');
console.log('PREVIEW HTTP SMOKE TEST PASSED for '+origin);
