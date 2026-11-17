import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Never reaches the network: all scenarios must be rejected by preflight.
const target='scripts/account-deletion-live-e2e.mjs';
const base={
 VIAJA_E2E_DELETE_ALLOW:'DELETE_QA_ACCOUNT',
 VIAJA_E2E_DELETE_PREVIEW_URL:'https://feat-stage8-secure-account-deletion.viaja.pages.dev',
 VIAJA_E2E_PUBLISHABLE_KEY:'test-public-key',
 VIAJA_E2E_DELETE_USER_A_EMAIL:'viaja-e2e-delete-a@example.com',
 VIAJA_E2E_DELETE_USER_A_PASSWORD:'unused-test-password',
 VIAJA_E2E_DELETE_USER_B_EMAIL:'viaja-e2e-delete-b@example.com',
 VIAJA_E2E_DELETE_USER_B_PASSWORD:'unused-test-password',
 VIAJA_E2E_DELETE_CONFIRM_EMAIL:'viaja-e2e-delete-a@example.com'
};
function rejected(overrides:Record<string,string>,reason:string){
 const result=spawnSync(process.execPath,[target],{
  env:{NODE_ENV:'test',...base,...overrides},encoding:'utf8',timeout:5000
 });
 assert.notEqual(result.status,0,reason);
 assert.ok((result.stderr||'').includes(reason),`Expected safety guard ${reason}`);
}
rejected({VIAJA_E2E_DELETE_ALLOW:'yes'},'Refusing destructive test');
rejected({VIAJA_E2E_DELETE_PREVIEW_URL:'https://viaja.pages.dev'},'Only a Cloudflare branch preview');
rejected({VIAJA_E2E_DELETE_USER_A_EMAIL:'matias@gmail.com'},'Only explicitly named disposable accounts');
rejected({VIAJA_E2E_DELETE_CONFIRM_EMAIL:'viaja-e2e-delete-b@example.com'},'must be confirmed separately');
console.log('PASS destructive account E2E: opt-in, preview-only, named accounts and exact-email guards');
