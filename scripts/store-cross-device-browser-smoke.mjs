import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const base=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
const isSafari=process.env.VIAJA_BROWSER==='webkit';
const browser=await (isSafari?webkit:chromium).launch({
 headless:true,...(isSafari?{}:{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
});
const out='artifacts/store-readiness';
await mkdir(out,{recursive:true});
const devices=isSafari?[
 {name:'iphone390',width:390,height:844},
 {name:'desktop1280',width:1280,height:900}
]:[
 {name:'iphone320',width:320,height:720},
 {name:'iphone390',width:390,height:844},
 {name:'android412',width:412,height:915},
 {name:'desktop1280',width:1280,height:900}
];
const findings=[];
async function assertNoOverflow(page,label){
 const dimensions=await page.evaluate(()=>({
  visible:document.documentElement.clientWidth,
  scroll:document.documentElement.scrollWidth
 }));
 assert.ok(dimensions.scroll<=dimensions.visible+1,label+' horizontal overflow '+JSON.stringify(dimensions));
}
try{
 for(const device of devices){
  const mobile=device.width<600;
  const ctx=await browser.newContext({
   viewport:{width:device.width,height:device.height},
   isMobile:mobile,hasTouch:mobile,locale:'es-ES',
   colorScheme:'dark',reducedMotion:'reduce',
   serviceWorkers:'block'
  });
  await ctx.addInitScript(()=>{
   try{
    if(!window.localStorage)return;
    localStorage.setItem('viaja-theme','dark');
    localStorage.setItem('viaja-comfort-reading','on');
   }catch{}
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('heading',{name:/Todo gran viaje empieza con una idea/}).waitFor({timeout:15000});
  await page.waitForFunction(()=>document.documentElement.dataset.comfort==='on');
  const nav=page.getByRole('navigation',{name:'Navegación principal'});
  const home=nav.getByRole('button',{name:'Inicio'});
  assert.equal(await home.getAttribute('aria-current'),'page');
  const metrics=await page.evaluate(()=>{
   const p=performance.getEntriesByType('navigation')[0];
   const entries=performance.getEntriesByType('resource');
   const local=entries.filter(e=>{try{return new URL(e.name).origin===location.origin}catch{return false}});
   const bytes=local.reduce((sum,e)=>sum+(e.transferSize||0),0);
   const buttons=[...document.querySelectorAll('.topbar nav button')].map(x=>({
    label:x.textContent?.trim(),height:x.getBoundingClientRect().height
   }));
   return {responseMs:Math.round(p?.responseEnd||0),localAssetBytes:bytes,
    bodyFont:parseFloat(getComputedStyle(document.body).fontSize),buttons};
  });
  assert.ok(metrics.responseMs<10000,'Document navigation too slow '+JSON.stringify(metrics));
  assert.ok(metrics.localAssetBytes<8*1024*1024,'Large first-load assets '+JSON.stringify(metrics));
  assert.ok(metrics.bodyFont>=16,'Comfort text must be readable');
  assert.ok(metrics.buttons.every(b=>b.height>=44),'Touch targets smaller than 44 px');
  await assertNoOverflow(page,device.name+' home');
  await page.screenshot({path:out+'/'+(isSafari?'safari':'chrome')+'-'+device.name+'-home.png',fullPage:true});
  await nav.getByRole('button',{name:/Planificar/}).click();
  await page.getByRole('heading',{name:'¿A dónde te gustaría viajar?'}).waitFor();
  await assertNoOverflow(page,device.name+' planner');
  await nav.getByRole('button',{name:'Reservas'}).click();
  await page.getByRole('heading',{name:/Tus reservas, siempre a mano/}).waitFor();
  await assertNoOverflow(page,device.name+' reservations');
  await page.screenshot({path:out+'/'+(isSafari?'safari':'chrome')+'-'+device.name+'-reservations.png',fullPage:true});
  await nav.getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('heading',{name:'Mis viajes',exact:true}).waitFor();
  await assertNoOverflow(page,device.name+' trips');
  assert.deepEqual(errors,[],'Unexpected JavaScript exceptions on '+device.name);
  findings.push({browser:isSafari?'WebKit':'Chromium',device:device.name,...metrics,jsErrors:0});
  await ctx.close();
 }
 await writeFile(out+'/'+(isSafari?'safari':'chrome')+'-performance.json',JSON.stringify(findings,null,2)+'\n');
 console.log('PASS Stage8 '+(isSafari?'Safari/WebKit':'Chrome/Android')+' mobile/desktop navigation, error-free runtime, touch, comfort, budget');
}finally{
 await browser.close();
}
