import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-smoke/node_modules/playwright/index.mjs';

const origin=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
await mkdir('artifacts/v1-mobile-ux',{recursive:true});
const browserName=process.env.VIAJA_BROWSER==='webkit'?'webkit':'chromium';
const runner=browserName==='webkit'?webkit:chromium;
const browser=await runner.launch(browserName==='webkit'?{headless:true}:{headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const cities={
 paris:{id:1,name:'París',country:'Francia',region:'Isla de Francia',latitude:48.8566,longitude:2.3522,featureCode:'PPLC',population:2100000},
 toledo:{id:2,name:'Toledo',country:'España',region:'Castilla-La Mancha',latitude:39.8628,longitude:-4.0273,featureCode:'PPLA',population:85000},
 rosario:{id:3,name:'Rosario',country:'Argentina',region:'Santa Fe',latitude:-32.9468,longitude:-60.6393,featureCode:'PPLA2',population:950000},
 roma:{id:4,name:'Roma',country:'Italia',region:'Lacio',latitude:41.9028,longitude:12.4964,featureCode:'PPLC',countryCode:'IT',population:2800000},
 milano:{id:5,name:'Milano',country:'Italia',region:'Lombardía',latitude:45.4642,longitude:9.19,featureCode:'PPLA',countryCode:'IT',population:1300000}
};
try{
 for(const viewport of [{width:390,height:844,name:'iphone'},{width:1280,height:900,name:'desktop'}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'es-ES'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cityFixture=(value)=>{
   const q=value.toLocaleLowerCase('es');
   return q.includes('tol')?cities.toledo:q.includes('ros')?cities.rosario:cities.paris;
  };
  await page.route('**/api/cities?*',route=>{
   const q=new URL(route.request().url()).searchParams.get('q')||'';
   const country=q.toLocaleLowerCase('es').includes('ital');
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(country?{mode:'country',cities:[cities.roma,cities.milano]}:{mode:'city',cities:[cityFixture(q)]})});
  });
  // WebKit can exercise the GeoNames fallback when Pages Functions are temporarily
  // unavailable. Keep both paths deterministic for a UI behavior test.
  await page.route('**/v1/search?*',route=>{
   const q=new URL(route.request().url()).searchParams.get('name')||'';
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[cityFixture(q)]})});
  });
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('button',{name:'Planificar'}).first().click();
  await page.getByRole('button',{name:'Abrir guía de Madrid imprescindible en Explorar destinos'}).click();
  await page.getByRole('heading',{name:'Madrid imprescindible',exact:true}).waitFor({state:'visible',timeout:20000});
  await page.getByText('Puerta del Sol').first().waitFor({state:'visible'});
  await page.screenshot({path:'artifacts/v1-mobile-ux/'+viewport.name+'-madrid-guide.png'});
  await page.getByRole('button',{name:'Planificar'}).first().click();
  const originCity=page.getByRole('combobox',{name:'Ciudad de salida'});
  assert.equal(await originCity.inputValue(),'','New trip leaves city of departure empty');
  const add=page.getByRole('button',{name:'Agregar otro destino'});
  assert.ok(await add.isDisabled(),'Cannot add extra city before main city selected');
  await page.getByRole('combobox',{name:'Destino principal'}).fill('Paris');
  await page.getByRole('option',{name:/París.*Francia/}).first().click();
  assert.equal(await page.getByRole('combobox',{name:'Destino principal'}).inputValue(),'París, Francia');
  assert.ok(await add.isEnabled(),'Selecting main city unlocks first additional destination');
  await add.click();
  assert.ok(await add.isDisabled(),'Blank additional city blocks subsequent destination');
  await page.getByRole('combobox',{name:'Destino adicional 2'}).fill('Tol');
  assert.ok(await add.isDisabled(),'Typing does not count as selecting a city');
  // The geocoder may return different matches for a partial query across providers.
  // Select the first visible option: this tests interaction, not ranking or geography.
  const option=page.getByRole('option').first();
  try{
   await option.waitFor({state:'visible',timeout:9000});
  }catch(e){
   console.log('DEBUG '+browserName+' '+viewport.name+' missing selectable city option',
    JSON.stringify({input:await page.getByRole('combobox',{name:'Destino adicional 2'}).inputValue(),
    expanded:await page.getByRole('combobox',{name:'Destino adicional 2'}).getAttribute('aria-expanded'),
    results:await page.locator('.city-results').allInnerTexts(),
    options:await page.locator('[role=option]').allInnerTexts()}));
   throw e;
  }
  await option.click();
  const selectedExtra=await page.getByRole('combobox',{name:'Destino adicional 2'}).inputValue();
  assert.ok(selectedExtra.includes(','),'Selected additional destination has both city and country');
  assert.ok(await add.isEnabled(),'Selecting the previous city unlocks the next');
  const first=page.getByRole('combobox',{name:'Destino principal'});
  const second=page.getByRole('combobox',{name:'Destino adicional 2'});
  const firstRect=await first.boundingBox(),secondRect=await second.boundingBox();
  assert.ok(firstRect&&secondRect&&Math.abs(firstRect.x-secondRect.x)<2&&Math.abs(firstRect.width-secondRect.width)<2,'Primary city and secondary city inputs align');
  assert.ok(await page.getByRole('button',{name:'Subir destino 1'}).isDisabled(),'First city cannot move above first');
  await page.getByRole('button',{name:'Subir destino 2'}).click();
  assert.equal(await first.inputValue(),selectedExtra,'Secondary city can become primary');
  assert.equal(await second.inputValue(),'París, Francia','Former primary becomes second city');
  await page.getByRole('button',{name:'Bajar destino 1'}).click();
  assert.equal(await first.inputValue(),'París, Francia','Primary can move down again');
  assert.equal(await second.inputValue(),selectedExtra,'Secondary restored after moving primary');
  await add.click();
  assert.equal(await page.getByRole('combobox',{name:'Destino adicional 3'}).inputValue(),'');
  assert.ok(await add.isDisabled(),'New empty third destination cannot be bypassed');
  // A country suggests its actual major cities, not namesake towns abroad.
  const main=page.getByRole('combobox',{name:'Destino principal'});
  await main.fill('Italia');
  await page.getByRole('option',{name:/Roma.*Italia/}).waitFor({state:'visible'});
  assert.equal(await page.getByRole('option',{name:/Milano.*Italia/}).count(),1,'Country lists a second major city');
  assert.equal(await page.getByRole('option',{name:/Italia.*México/}).count(),0,'Country search excludes namesake Mexican towns');
  await main.fill('Rosario');
  const rosario=page.getByRole('option',{name:/Rosario.*Santa Fe.*Argentina/});
  await rosario.waitFor({state:'visible'});
  assert.match(await rosario.innerText(),/Santa Fe, Argentina/,'Region and country appear under Rosario');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert.ok(overflow.scroll<=overflow.viewport+3,'No horizontal overflow: '+JSON.stringify(overflow));
  await page.screenshot({path:'artifacts/v1-mobile-ux/'+viewport.name+'-sequential-cities.png'});
  assert.equal(errors.length,0,'No uncaught browser errors: '+errors.join('; '));
  console.log('PASS '+browserName+' '+viewport.name+' Madrid guide navigation, sequential cities, layout');
  await context.close();
 }
}finally{await browser.close()}
