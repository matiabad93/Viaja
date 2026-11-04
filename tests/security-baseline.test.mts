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
console.log('PASS: static + API security headers, API fail-closed, Android secure transport and frontend key hygiene');
