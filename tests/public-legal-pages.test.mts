import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const support='viaja.app.soporte@gmail.com';
const pages=['privacy','support','delete-account'] as const;
for(const name of pages){
 const html=read('public/'+name+'.html');
 assert.match(html,/<html lang="es">/);
 assert.match(html,/name="viewport"/);
 assert.match(html,/name="robots" content="index,follow"/);
 assert.match(html,/href="\/"/);
 assert.ok(html.includes('href="/privacy.html"')||name==='privacy');
 assert.ok(html.includes('href="/support.html"')||name==='support');
 assert.ok(html.includes('href="/delete-account.html"')||name==='delete-account');
}
assert.match(read('public/privacy.html'),/Matías Abad/);
assert.ok(read('public/privacy.html').includes('mailto:'+support));
assert.ok(read('public/support.html').includes('mailto:'+support));
assert.ok(read('public/delete-account.html').includes('/?account=delete'));
assert.ok(!read('public/delete-account.html').includes('Funcionalidad en validación'));
assert.ok(read('app/page.tsx').includes('/privacy.html'));
assert.ok(read('app/page.tsx').includes('/support.html'));
console.log('PASS privacy, support and account-deletion public pages and app links');
