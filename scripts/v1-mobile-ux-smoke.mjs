import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-smoke/node_modules/playwright/index.mjs';

const origin=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
await mkdir('artifacts/v1-mobile-ux',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const cities={
 paris:{id:1,name:'París',country:'Francia',region:'Isla de Francia',latitude:48.8566,longitude:2.3522,featureCode:'PPLC',population:2100000},
 toledo:{id:2,name:'Toledo',country:'España',region:'Castilla-La Mancha',latitude:39.8628,longitude:-4.0273,featureCode:'PPLA',population:85000}
};
try{
 for(const viewport of [{width:390,height:844,name:'iphone'},{width:1280,height:900,name:'desktop'}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'es-ES'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/cities?*',route=>{
   const q=(new URL(route.request().url()).searchParams.get('q')||'').toLocaleLowerCase('es');
   const item=q.includes('tol')?cities.toledo:cities.paris;
   route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({cities:[item]})});
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
  await page.getByRole('option',{name:/Toledo.*España/}).first().click();
  assert.ok(await add.isEnabled(),'Selecting the previous city unlocks the next');
  const first=page.getByRole('combobox',{name:'Destino principal'});
  const second=page.getByRole('combobox',{name:'Destino adicional 2'});
  const firstRect=await first.boundingBox(),secondRect=await second.boundingBox();
  assert.ok(firstRect&&secondRect&&Math.abs(firstRect.x-secondRect.x)<2&&Math.abs(firstRect.width-secondRect.width)<2,'Primary city and secondary city inputs align');
  assert.ok(await page.getByRole('button',{name:'Subir destino 1'}).isDisabled(),'First city cannot move above first');
  await page.getByRole('button',{name:'Subir destino 2'}).click();
  assert.equal(await first.inputValue(),'Toledo, España','Secondary city can become primary');
  assert.equal(await second.inputValue(),'París, Francia','Former primary becomes second city');
  await page.getByRole('button',{name:'Bajar destino 1'}).click();
  assert.equal(await first.inputValue(),'París, Francia','Primary can move down again');
  assert.equal(await second.inputValue(),'Toledo, España','Secondary restored after moving primary');
  await add.click();
  assert.equal(await page.getByRole('combobox',{name:'Destino adicional 3'}).inputValue(),'');
  assert.ok(await add.isDisabled(),'New empty third destination cannot be bypassed');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert.ok(overflow.scroll<=overflow.viewport+3,'No horizontal overflow: '+JSON.stringify(overflow));
  await page.screenshot({path:'artifacts/v1-mobile-ux/'+viewport.name+'-sequential-cities.png'});
  assert.equal(errors.length,0,'No uncaught browser errors: '+errors.join('; '));
  console.log('PASS '+viewport.name+' Madrid guide navigation, sequential cities, layout');
  await context.close();
 }
}finally{await browser.close()}
