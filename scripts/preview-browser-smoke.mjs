/**
 * End-to-end preview smoke using non-personal fixture data only.
 * Requires Playwright in /tmp/viaja-smoke and Chrome on GitHub runner.
 * This test does not sign in or call paid AI.
 */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-smoke/node_modules/playwright/index.mjs';

const url=(process.env.VIAJA_PREVIEW_URL||'https://feat-v1-production-release-p.viaja.pages.dev').replace(/\/$/,'');
const fixture={
 id:'viaja-ci-local-fixture',kind:'draft',createdAt:'2026-10-30T00:00:00Z',
 trip:{
  destination:'Barcelona, España',origin:'Madrid, España',start:'2026-11-06',end:'2026-11-07',
  travelers:2,budget:90,pace:'Equilibrado',transport:'Sin coche',notes:'Prueba automatizada sin datos personales',
  links:'',adjustment:'',sources:['official'],
  city:{id:1,name:'Barcelona',country:'España',region:'Cataluña',latitude:41.3874,longitude:2.1686}
 },
 itinerary:[
  {id:'day-ci-1',title:'Barcelona, caminando',activities:[
   {id:'gaudi-ci',title:'Sagrada Familia',description:'Visita demostrativa',time:'10:00',location:'Sagrada Familia, Barcelona'},
   {id:'park-ci',title:'Parc de la Ciutadella',description:'Parque',time:'13:00',location:'Parc de la Ciutadella, Barcelona'}
  ]},
  {id:'day-ci-2',title:'Día libre',activities:[]}
 ],
 expenses:[
  {id:'coffee-ci',date:'2026-11-06',label:'Café de prueba',category:'Comida',amount:10,currency:'EUR',originalAmount:10,rate:1},
  {id:'hotel-ci',date:'2026-11-06',label:'Hotel de prueba',category:'Alojamiento',amount:200,currency:'EUR',originalAmount:200,rate:1}
 ]
};
await mkdir('artifacts/preview-browser',{recursive:true});
const browserName=process.env.VIAJA_BROWSER==='webkit'?'webkit':'chromium';
const browserType=browserName==='webkit'?webkit:chromium;
const launchOptions=browserName==='webkit'?{headless:true}:{headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']};
const browser=await browserType.launch(launchOptions);
try{
 for(const device of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},locale:'es-ES',deviceScaleFactor:1});
  await context.addInitScript(plan=>{localStorage.setItem('viaja-ai-trips-v1',JSON.stringify([plan]));},fixture);
  const page=await context.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('button',{name:/Mis viajes/}).first().waitFor({state:'visible',timeout:30000});
  await page.getByRole('button',{name:/Mis viajes/}).first().click();
  await page.locator('.journey-card').first().waitFor({state:'visible',timeout:10000});
  assert.ok(await page.locator('.journey-card').first().innerText().then(s=>s.includes('Barcelona')),'Fixture trip is visible');
  await page.locator('.journey-card button.journey-cover').first().click();
  await page.locator('.trip-detail').waitFor({state:'visible',timeout:10000});
  await page.locator('.detail-tabs button').filter({hasText:'Gastos'}).click();
  await page.getByText('Café de prueba').waitFor({state:'visible'});
  const panelText=await page.locator('.trip-detail').innerText();
  assert.ok(panelText.includes('Gastos diarios registrados'),'Daily budget metrics are visible');
  assert.ok(panelText.includes('10,00'),'Daily expenses total 10 EUR');
  assert.ok(panelText.includes('200,00'),'Extra hotel expense remains visible');
  console.log('PASS '+device.name+' trip list, itinerary navigation, budget and extra expense');
  await page.locator('.detail-tabs button').filter({hasText:'Itinerario'}).click();
  await page.getByRole('button',{name:'Mapa',exact:true}).click();
  await page.locator('.leaflet-container').waitFor({state:'visible',timeout:20000});
  const bounds=await page.locator('.leaflet-container').boundingBox();
  assert.ok(bounds&&bounds.width>200&&bounds.height>180,'Leaflet container has usable dimensions');
  assert.equal(await page.getByText('No pudimos cargar el mapa integrado.',{exact:false}).count(),0,'No map loader error');
  await page.screenshot({path:'artifacts/preview-browser/'+browserName+'-'+device.name+'-map.png',fullPage:false});
  console.log('PASS '+device.name+' Leaflet map created '+Math.round(bounds.width)+'x'+Math.round(bounds.height));
  await page.getByRole('button',{name:'Planificar'}).first().click();
  await page.locator('form.formcard').waitFor({state:'visible'});
  const numbers=page.locator('form.formcard input[type="number"]');
  assert.equal(await numbers.count(),2,'Travelers and budget fields exist');
  await numbers.nth(0).fill('');
  await numbers.nth(1).fill('');
  assert.equal(await numbers.nth(0).inputValue(),'','Travelers may be cleared before editing');
  assert.equal(await numbers.nth(1).inputValue(),'','Optional budget may be cleared');
  const departure=page.getByLabel('Fecha de salida',{exact:true});
  // The fixture already starts on 2026-11-06. A no-op fill would emit no change event.
  // Choose a later date to verify both focus and invalid-return clearing.
  await departure.fill('2026-11-08');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Fecha de regreso',null,{timeout:3000});
  const focus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));
  assert.equal(focus,'Fecha de regreso','Changing departure automatically focuses return date');
  assert.equal(await page.getByLabel('Fecha de regreso',{exact:true}).inputValue(),'','Invalid previous return date is cleared');
  await page.screenshot({path:'artifacts/preview-browser/'+browserName+'-'+device.name+'-planner.png',fullPage:false});
  assert.equal(errors.length,0,'No fatal browser page errors: '+errors.join('; '));
  console.log('PASS '+device.name+' planner fields, date focus and no browser page errors');
  await context.close();
 }
 console.log('BROWSER PREVIEW SMOKE PASSED ['+browserName+'] for '+url);
}finally{await browser.close()}
