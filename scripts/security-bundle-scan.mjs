import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const dir='web-dist';
const files=[];
function walk(path){
 for(const name of readdirSync(path)){
  const full=join(path,name);
  if(statSync(full).isDirectory())walk(full);
  else files.push(full);
 }
}
walk(dir);
const readable=files.filter(f=>/\.(?:js|mjs|html|css|json|map)$/i.test(f));
const indicators=[
 {name:'Supabase secret key',regex:/sb_secret_[A-Za-z0-9_-]{20,}/},
 {name:'OpenAI private key',regex:/(?<![A-Za-z0-9_-])sk-(?:(?:proj|svcacct)-[A-Za-z0-9_-]{30,}|[A-Za-z0-9]{40,})(?![A-Za-z0-9_-])/},
 {name:'Google Gemini API key',regex:/AIza[0-9A-Za-z_-]{30,}/},
 {name:'Private key PEM block',regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/}
];
let violations=0;
for(const file of readable){
 const content=readFileSync(file,'utf8');
 for(const check of indicators)if(check.regex.test(content)){
  console.error('Possible private credential bundled: '+check.name+' in '+file);
  violations++;
 }
}
const maps=files.filter(f=>/\.map$/i.test(f));
if(maps.length){
 console.error('Public source maps found in release output ('+maps.length+'). Review exposure before publishing.');
 violations++;
}
if(violations)process.exit(1);
console.log('PASS security bundle scan: '+readable.length+' text assets checked; no known private-key patterns or public sourcemaps.');
