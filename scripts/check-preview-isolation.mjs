import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

for(const file of [
 '.github/workflows/viaja-documents-preview.yml',
 '.github/workflows/viaja-logistics-preview.yml'
]){
 const contents=readFileSync(file,'utf8');
 assert.match(contents,/environment:\s*preview/,'Preview must use preview environment: '+file);
 assert.match(contents,/secrets\.VIAJA_CF_PREVIEW_API_TOKEN/);
 assert.match(contents,/secrets\.VIAJA_CF_PREVIEW_ACCOUNT_ID/);
 assert.doesNotMatch(contents,/environment:\s*production/);
 assert.doesNotMatch(contents,/secrets\.(?:VIAJA_CF_API_TOKEN|CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\b/);
 assert.doesNotMatch(contents,/secrets\.(?:VIAJA_CF_ACCOUNT_ID|CLOUDFLARE_ACCOUNT_ID|CF_ACCOUNT_ID)\b/);
 assert.match(contents,/--branch (?!main\b)[a-z0-9/-]+/,'Must deploy only feature branch');
}
const production=readFileSync('.github/workflows/cloudflare-viaja-production.yml','utf8');
assert.match(production,/branches:\s*\[main\]/,'Production deploy must be restricted to main');
console.log('PASS P1.2: Preview CI cannot read production Cloudflare secrets and never deploys main');
