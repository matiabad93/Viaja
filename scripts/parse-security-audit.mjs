import {readFileSync} from 'node:fs';

const [path,label='Dependency audit']=process.argv.slice(2);
if(!path)throw Error('Provide npm audit JSON path');
let report;
try{report=JSON.parse(readFileSync(path,'utf8'))}
catch{console.error(label+': npm audit returned no valid JSON; scan status unknown');process.exit(2)}
if(report.error){console.error(label+': vulnerability scan unavailable: '+String(report.error.code||report.error.message||'registry error').slice(0,120));process.exit(2)}
const severities=['critical','high','moderate','low','info'];
const items=Object.entries(report.vulnerabilities||{}).map(([name,value])=>({
 name,severity:value.severity||'unknown',isDirect:Boolean(value.isDirect),range:String(value.range||'')
}));
const counts=Object.fromEntries(severities.map(s=>[s,items.filter(v=>v.severity===s).length]));
console.log(label+': '+severities.map(s=>s+'='+counts[s]).join(', '));
for(const row of items.filter(v=>v.severity==='critical'||v.severity==='high').slice(0,25))
 console.error('HIGH-RISK package '+row.name+' severity='+row.severity+' direct='+row.isDirect+' affected='+row.range);
if(items.some(v=>v.severity==='critical'||v.severity==='high')){
 console.error('High/critical dependency issues require a version update and retest.');
 process.exit(1);
}
console.log(label+': no reported high or critical runtime npm advisory');
