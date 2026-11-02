import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-smoke/node_modules/playwright/index.mjs';
const target='http://127.0.0.1:4173/';
await mkdir('artifacts/tupa-demo',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const viewport of [{width:390,height:844,name:'mobile'},{width:1280,height:900,name:'desktop'}]){
  const context=await browser.newContext({viewport,locale:'es-AR'});
  const page=await context.newPage();
  const errors=[];
  const supabaseRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(request.url().includes('.supabase.co'))supabaseRequests.push(request.url())});
  await page.goto(target,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Tu próximo destino,/}).waitFor({state:'visible',timeout:20000});
  assert.equal(await page.getByRole('link',{name:/Tupã Travel · Demo/}).count(),1);
  assert.equal(await page.getByRole('link',{name:/Instagram/}).count(),1);
  assert.equal(await page.getByRole('button',{name:/Crear un viaje de prueba/}).count(),1);
  const logo=page.locator('.tupa-presentation-logo');
  assert.ok(await logo.evaluate(el=>el instanceof HTMLImageElement&&el.complete&&el.naturalWidth>0),'Agency logo actually loads');
  const saved=await page.evaluate(()=>localStorage.getItem('tupa-demo-trips-v1'));
  assert.ok(saved,'Demo seeds independent local trips');
  assert.ok(JSON.parse(saved).some(p=>p.trip.destination==='Roma, Italia'),'Editable Rome example exists');
  assert.equal(supabaseRequests.length,0,'Demo must not send requests to live production Supabase');
  assert.ok(errors.length===0,'No runtime JavaScript exceptions: '+errors.join('; '));
  await page.screenshot({path:'artifacts/tupa-demo/'+viewport.name+'-home.png',fullPage:true});
  await page.getByRole('button',{name:/Mis viajes/}).first().click();
  await page.getByText(/Roma, Italia/).first().waitFor({state:'visible'});
  await page.screenshot({path:'artifacts/tupa-demo/'+viewport.name+'-saved.png',fullPage:true});
  await context.close();
  console.log('PASS tupa '+viewport.name+' branding, real logo, agency links, local example, production DB isolation');
 }
}finally{await browser.close();}
