/**
 * Google Play listing preflight. It validates copy/brand assets without accessing
 * accounts, user data, or developer credentials. Missing device screenshots are
 * tracked as a manual launch blocker unless --require-screenshots is passed.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const root='store/google-play';
const listing=JSON.parse(readFileSync(join(root,'listing.es-ES.json'),'utf8'));
const required={appName:30,shortDescription:80,fullDescription:4000};
for(const [key,max] of Object.entries(required)){
  const value=listing[key];
  assert.equal(typeof value,'string',`${key} must be text`);
  assert.ok(value.trim().length>0,`${key} cannot be empty`);
  assert.ok(value.length<=max,`${key} has ${value.length} characters; Google Play allows ${max}`);
  console.log(`PASS ${key}: ${value.length}/${max} characters`);
}
assert.equal(listing.packageName,'com.matiabad.viaja','Package name must match signed AAB');
assert.equal(listing.contactEmail,'viaja.app.soporte@gmail.com','Use dedicated support inbox');
for(const name of ['websiteUrl','privacyPolicyUrl','supportUrl','accountDeletionUrl']){
  assert.equal(new URL(listing[name]).protocol,'https:',`${name} must use HTTPS`);
}
assert.equal(new URL(listing.privacyPolicyUrl).pathname,'/privacy.html');
assert.equal(new URL(listing.supportUrl).pathname,'/support.html');
assert.equal(new URL(listing.accountDeletionUrl).pathname,'/delete-account.html');
for(const path of ['public/privacy.html','public/support.html']){
  assert.ok(existsSync(path),`Missing public page ${path}`);
  assert.ok(readFileSync(path,'utf8').includes(listing.contactEmail),`Missing support contact in ${path}`);
}
assert.ok(existsSync('public/delete-account.html'),'Missing public account deletion page');
assert.ok(readFileSync('public/delete-account.html','utf8').includes('/support.html'),
  'Account deletion page must link to a contact route');
console.log('PASS privacy, support, account deletion, HTTPS links');

function pngDimensions(path){
  const b=readFileSync(path);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${path} is not PNG`);
  return [b.readUInt32BE(16),b.readUInt32BE(20)];
}
for(const [file,w,h] of [['public/icon-512.png',512,512],[join(root,'feature-graphic.png'),1024,500]]){
  assert.ok(existsSync(file),`Missing store art: ${file}`);
  assert.deepEqual(pngDimensions(file),[w,h],`${file} must be ${w}x${h}`);
  assert.ok(statSync(file).size<15*1024*1024,`${file} is unexpectedly large`);
}
console.log('PASS Play icon 512×512 and feature graphic 1024×500');

const screenDir=join(root,'screenshots','phone');
const screens=existsSync(screenDir)?readdirSync(screenDir).filter(name=>/\.png$/i.test(name)):[];
if(process.argv.includes('--require-screenshots')){
  assert.ok(screens.length>=2,'Google Play requires at least two genuine device screenshots');
}
console.log(screens.length>=2?`PASS phone screenshots: ${screens.length}`:
  'BLOCK MANUAL: capture at least two real phone screenshots from the signed app before submission');
console.log('Play listing copy and artwork: PASS. Signed AAB and Play Console declarations are separate requirements.');
