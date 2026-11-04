import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const staticHeaders=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
for(const item of ['X-Frame-Options: DENY','X-Content-Type-Options: nosniff',
 'Referrer-Policy: no-referrer','Strict-Transport-Security:',
 "object-src 'none'","frame-ancestors 'none'","form-action 'self'"])
 assert.ok(staticHeaders.includes(item),'Missing static security header: '+item);
assert.ok(!/script-src\s+[^;\n]*unsafe-eval/.test(staticHeaders),'Never allow unsafe-eval');
const api=readFileSync(new URL('../functions/api/[[path]].ts',import.meta.url),'utf8');
for(const header of ['X-Frame-Options','X-Content-Type-Options','Referrer-Policy',
 'Cross-Origin-Resource-Policy','Content-Security-Policy','Cache-Control'])
 assert.ok(api.includes(header),'Missing API security header: '+header);
assert.match(api,/return new Response\(result\.body,\{status:result\.status/);
assert.match(api,/if\(!headers\.has\('Cache-Control'\)\)/,'Preserve deliberate cache headers');
const gateway=readFileSync(new URL('../server/ai-gateway.ts',import.meta.url),'utf8');
assert.match(gateway,/if\(request\.headers\.get\('origin'\)!==new URL\(request\.url\)\.origin\)/);
assert.match(gateway,/if\(!user\)return response\(\{code:'AUTH_REQUIRED'/);
assert.match(gateway,/invokeQuota\(env,'viaja_reserve_ai_request'/);
const extraction=readFileSync(new URL('../server/reservation-extraction.ts',import.meta.url),'utf8');
assert.match(extraction,/input\.consent!==true/);
assert.match(extraction,/item\.owner_id!==userId/);
assert.match(extraction,/rpc\/viaja_reserve_pdf_extract/);
const cap=readFileSync(new URL('../mobile/capacitor.config.json',import.meta.url),'utf8');
assert.match(cap,/"cleartext"\s*:\s*false/);
assert.match(cap,/"allowMixedContent"\s*:\s*false/);
const manifest=readFileSync(new URL('../mobile/android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
assert.match(manifest,/android:allowBackup="false"/);
assert.match(manifest,/android:usesCleartextTraffic="false"/);
const frontend=readFileSync(new URL('../lib/supabase-client.ts',import.meta.url),'utf8');
assert.doesNotMatch(frontend,/sb_secret_[a-zA-Z0-9]+/,'Never embed privileged credentials in frontend');
assert.doesNotMatch(frontend,/service_role[^\\\n]*Bearer/,'Do not pass service key as frontend auth');
assert.ok(existsSync(new URL('../supabase/migrations/202611040002_reservation_library_private_pdf.sql',import.meta.url)));

const quotaMigration=readFileSync(new URL('../supabase/migrations/202611040003_document_quotas_backend_upload.sql',import.meta.url),'utf8');
for(const rule of ['viaja_reservation_document_quota','viaja_trip_document_quota','DOCUMENT_COUNT_LIMIT_50','DOCUMENT_STORAGE_LIMIT_100MB','DOCUMENT_UPLOAD_LIMIT_30_PER_DAY','drop policy if exists viaja_reservation_object_upload','drop policy if exists viaja_storage_doc_editor_insert'])
 assert.ok(quotaMigration.includes(rule),'Missing document quota/storage protection: '+rule);
const invokerMigration=readFileSync(new URL('../supabase/migrations/202611040004_quota_usage_invoker_rpc.sql',import.meta.url),'utf8');
assert.match(invokerMigration,/create or replace function public\.viaja_document_usage\(\)[\s\S]*?security invoker/,'Public quota RPC must be SECURITY INVOKER');
assert.match(invokerMigration,/revoke all on function public\.viaja_document_usage\(\) from public,anon,authenticated/);
const upload=readFileSync(new URL('../server/private-document-upload.ts',import.meta.url),'utf8');
for(const guard of ["request.method!=='POST'",'safeOrigin(request)','SUPABASE_SECRET_KEY','Bearer [A-Za-z0-9._-]','/auth/v1/user','record.owner_id:record.uploaded_by','verifyMagic(bytes,record.mime_type)','bytes.byteLength!==record.size_bytes',"'x-upsert':'false'"])
 assert.ok(upload.includes(guard),'Missing private upload guard: '+guard);
assert.match(upload,/MAX_FILE_BYTES=10485760/);
assert.match(upload,/viaja_can_upload_trip_document/);
const preview=readFileSync(new URL('../.github/workflows/viaja-documents-preview.yml',import.meta.url),'utf8');
assert.match(preview,/environment: preview/);
assert.match(preview,/secrets\.VIAJA_CF_PREVIEW_API_TOKEN/);
assert.doesNotMatch(preview,/environment: production|secrets\.CLOUDFLARE_API_TOKEN/);
console.log('PASS: document quota, invoker RPC, private upload authorization and Preview isolation');

console.log('PASS: static + API security headers, API fail-closed, Android secure transport and frontend key hygiene');
