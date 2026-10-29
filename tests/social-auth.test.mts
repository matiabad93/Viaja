import assert from 'node:assert/strict';
// @ts-ignore Node's --experimental-strip-types supports importing TypeScript directly.
import {parseSocialProviderSettings,buildSocialAuthorizationUrl} from '../lib/social-auth.ts';

assert.deepEqual(parseSocialProviderSettings(null),{google:false,apple:false,facebook:false});
assert.deepEqual(parseSocialProviderSettings({external:{google:true,apple:true,facebook:false}}),{google:true,apple:true,facebook:false});
assert.deepEqual(parseSocialProviderSettings({external:{google:'true',apple:1,facebook:true}}),{google:false,apple:false,facebook:true});
const target=buildSocialAuthorizationUrl('https://example-project.supabase.co','google','https://feat-v1-production-release-p.viaja.pages.dev/');
const authorize=new URL(target);
assert.equal(authorize.origin,'https://example-project.supabase.co');
assert.equal(authorize.pathname,'/auth/v1/authorize');
assert.equal(authorize.searchParams.get('provider'),'google');
assert.equal(authorize.searchParams.get('redirect_to'),'https://feat-v1-production-release-p.viaja.pages.dev/');
assert.throws(()=>buildSocialAuthorizationUrl('http://fake.supabase.co','google','https://viaja.pages.dev/'));
assert.throws(()=>buildSocialAuthorizationUrl('https://example-project.supabase.co','google','javascript:alert(1)'));
assert.throws(()=>buildSocialAuthorizationUrl('https://example-project.supabase.co','google','https://user:password@viaja.pages.dev/'));
console.log('Social OAuth helper checks passed');
