import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const base='http://127.0.0.1:4173';
await mkdir('artifacts/ui-delivery-a',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const screen of [{width:390,height:844,label:'iphone'},{width:1280,height:900,label:'desktop'}]){
  const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},colorScheme:'light',locale:'es-ES'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Apariencia:/}).waitFor();
  const opener=page.getByRole('button',{name:/Apariencia:/});
  await opener.click();
  await page.getByRole('menuitemradio',{name:'Oscuro'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  assert.equal(await page.evaluate(()=>localStorage.getItem('viaja-theme')),'dark');
  await page.screenshot({path:'artifacts/ui-delivery-a/'+screen.label+'-dark.png',fullPage:true});
  await page.reload();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.getByRole('button',{name:/Apariencia:/}).click();
  await page.getByRole('menuitemradio',{name:'Claro'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.getByRole('button',{name:/Apariencia:/}).click();
  await page.getByRole('menuitemradio',{name:'Sistema'}).click();
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');

  const favorite=page.getByRole('button',{name:/Guardar en favoritos:/}).first();
  await favorite.waitFor();
  const before=await favorite.boundingBox();
  await favorite.click();
  const after=await page.getByRole('button',{name:/Quitar de favoritos:/}).first().boundingBox();
  assert.ok(before&&after,'favorite button is visible');
  assert.ok(Math.abs(before.width-after.width)<0.6&&Math.abs(before.height-after.height)<0.6,
   'The heart button cannot resize when favorited');
  await page.getByRole('button',{name:/Quitar de favoritos:/}).first().click();

  await page.getByRole('button',{name:'Viajes compartidos'}).click();
  const pace=page.getByRole('combobox',{name:'Ritmo'});
  const duration=page.getByRole('combobox',{name:'Duración'});
  await pace.click();
  await page.getByRole('option',{name:'Intenso'}).click();
  assert.match(await pace.innerText(),/Intenso/);
  await duration.click();
  await page.getByRole('option',{name:'4–7 días'}).click();
  assert.match(await duration.innerText(),/4–7 días/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=1,'Mobile screen cannot overflow horizontally: '+overflow);
  await page.screenshot({path:'artifacts/ui-delivery-a/'+screen.label+'-filters.png',fullPage:true});
  assert.deepEqual(errors,[],'No JS runtime errors');
  console.log('PASS '+screen.label+' theme preference, system events, stable favorites, custom selects');
  await context.close();
 }
}finally{await browser.close()}
