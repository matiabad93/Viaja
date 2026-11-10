import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAllowedApiOrigin,capacitorCorsOrigin} from '../server/origin-policy.ts';

const url='https://viaja.pages.dev/api/private-documents/upload';
const request=(origin:string|null)=>new Request(url,{method:'POST',headers:origin?{Origin:origin}:{}});
for(const origin of ['https://viaja.pages.dev','https://localhost','capacitor://localhost']){
 assert.equal(isAllowedApiOrigin(request(origin)),true,'Trusted origin denied: '+origin);
}
for(const origin of ['https://evil.example','https://localhost.evil.example','http://localhost','null','file://','https://viaja.pages.dev.evil.example',null]){
 assert.equal(isAllowedApiOrigin(request(origin)),false,'Untrusted origin accepted: '+origin);
}
for(const origin of ['https://localhost','capacitor://localhost'])assert.equal(capacitorCorsOrigin(request(origin)),origin);
assert.equal(capacitorCorsOrigin(request('https://viaja.pages.dev')),null);
assert.equal(capacitorCorsOrigin(request('https://evil.example')),null);
const cors=readFileSync(new URL('../functions/api/[[path]].ts',import.meta.url),'utf8');
for(const part of ['Access-Control-Allow-Origin','Access-Control-Allow-Methods','Access-Control-Allow-Headers','Access-Control-Max-Age','Vary','request.method===\'OPTIONS\'','status:204','capacitorCorsOrigin'])assert.ok(cors.includes(part),'Missing native CORS guard '+part);
assert.ok(!cors.includes("'Access-Control-Allow-Origin','*'"),'Wildcard CORS is not allowed');
const server=readFileSync(new URL('../server/ai-gateway.ts',import.meta.url),'utf8');
const upload=readFileSync(new URL('../server/private-document-upload.ts',import.meta.url),'utf8');
const extraction=readFileSync(new URL('../server/reservation-extraction.ts',import.meta.url),'utf8');
for(const [name,value] of [['AI',server],['upload',upload],['extraction',extraction]]){
 assert.ok(value.includes('isAllowedApiOrigin(request)'),name+' skipped strict origin validation');
}
const oauth=readFileSync(new URL('../lib/supabase-client.ts',import.meta.url),'utf8');
assert.ok(oauth.includes('if(nativeApp||!cloudReady)'), 'Native must not expose unverified OAuth callbacks');
assert.ok(oauth.includes("nativeApp?'https://viaja.pages.dev':window.location.origin"),'Native confirmation needs HTTPS');
const signing=readFileSync(new URL('../mobile/android/app/build.gradle',import.meta.url),'utf8');
assert.ok(signing.includes('viajaReleaseSigningReady')&&signing.includes('signingConfig signingConfigs.viajaUpload'));
const workflow=readFileSync(new URL('../.github/workflows/android-play-release.yml',import.meta.url),'utf8');
for(const part of ['workflow_dispatch','environment: android-release','VIAJA_ANDROID_UPLOAD_KEYSTORE_B64','bundleRelease','jarsigner -verify','VIAJA_API_BASE: https://viaja.pages.dev']) assert.ok(workflow.includes(part));
assert.ok(!/service_role|SUPABASE_SECRET_KEY/.test(workflow),'Mobile release may not use admin secrets');
console.log('PASS mobile: exact-origin CORS, email-only native OAuth fallback, signed AAB release contract');
