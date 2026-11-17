import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

// Simulate devices without WebGL2: they must retain guides, stop lists and a safe map fallback.
const base=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
const out='artifacts/store-readiness';
await mkdir(out,{recursive:true});
for(const [name,browserType] of [['chrome',chromium],['safari',webkit]]){
 const browser=await browserType.launch({headless:true,...(name==='chrome'?{
  executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']
 }: {})});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-ES',serviceWorkers:'block'});
  await ctx.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){
    if(type==='webgl2')return null;
    return original.call(this,type,...args);
   };
   const locations=[
    ['coliseo, roma, italia',41.8902,12.4922],
    ['foro romano, roma, italia',41.8925,12.4853],
    ['colina capitolina, roma, italia',41.8933,12.4829],
    ['piazza venezia, roma, italia',41.8959,12.4822]
   ];
   for(const [query,lat,lon] of locations){
    try { localStorage.setItem('viaja-place-v1:'+query,JSON.stringify({lat,lon,saved:Date.now()})); } catch { /* Cross-origin and sandboxed frames cannot access storage. */ }
   }
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:/Explorar/}).click();
  await page.getByRole('heading',{name:'Encontrá un viaje que te inspire.'}).waitFor({timeout:15000});
  const rome=page.locator('.explore-card').filter({has:page.getByRole('heading',{name:'Roma',exact:true})});
  await rome.getByRole('button',{name:'Ver itinerario'}).click();
  await page.getByRole('heading',{name:'Tu recorrido en el mapa'}).waitFor();
  await page.getByRole('alert').filter({hasText:'Este dispositivo no admite el mapa interactivo'}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Mostrar lugares en el mapa'}).click();
  await page.getByRole('button',{name:'Mostrar lugares en el mapa'}).waitFor({timeout:15000});
  await page.locator('iframe[title^="Mapa alternativo de"]').waitFor({timeout:10000});
  assert.ok(await page.getByRole('link',{name:'Abrir ruta en Google Maps'}).isVisible(),'Google Maps fallback remains available');
  assert.ok(await page.getByRole('heading',{name:'Roma',exact:true}).isVisible(),'Guide must remain open');
  assert.equal(await page.getByRole('heading',{name:'No pudimos abrir Viaja'}).count(),0,'Global app error boundary opened');
  assert.deepEqual(errors,[],name+' unexpected JS errors in no-WebGL mode');
  await page.screenshot({path:out+'/map-no-webgl-'+name+'-iphone.png',fullPage:true});
  await ctx.close();
  console.log('PASS '+name+' iPhone-size map fallback without WebGL2, guide and route retained');
 }finally{await browser.close()}
}
