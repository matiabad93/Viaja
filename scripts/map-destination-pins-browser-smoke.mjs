import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const base='http://127.0.0.1:4173';
const dir='artifacts/store-readiness';
await mkdir(dir,{recursive:true});
const places=[
 {id:'a',title:'Coliseo',location:'Coliseo, Roma, Italia',description:'Anfiteatro',time:'09:00',lat:41.8902,lon:12.4922},
 {id:'b',title:'Foro Romano',location:'Foro Romano, Roma, Italia',description:'Ruinas',time:'11:00',lat:41.8925,lon:12.4853},
 {id:'c',title:'Piazza Venezia',location:'Piazza Venezia, Roma, Italia',description:'Plaza central',time:'14:00',lat:41.8959,lon:12.4822}
];
const plan={id:'map-safari-regression',kind:'draft',createdAt:'2026-11-17T09:00:00Z',
 trip:{destination:'Roma, Italia',city:{id:1,name:'Roma',country:'Italia',region:'Lazio',latitude:41.9028,longitude:12.4964},
 origin:'Barcelona, España',start:'2026-11-20',end:'2026-11-22',travelers:2,budget:0,
 pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official']},
 itinerary:[{id:'rome-day',title:'Roma histórica',activities:places.map(({id,title,location,description,time})=>({id,title,location,description,time}))}],
 expenses:[]};
for(const {browserType,name} of [{browserType:chromium,name:'chrome'},{browserType:webkit,name:'safari'}]){
 const browser=await browserType.launch({headless:true,...(name==='chrome'?{
  executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']
 }: {})});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'es-ES',isMobile:true,hasTouch:true});
  await ctx.addInitScript(({plan,places})=>{
   localStorage.setItem('viaja-ai-trips-v1',JSON.stringify([plan]));
   for(const place of places)localStorage.setItem('viaja-place-v1:'+place.location.toLowerCase(),
    JSON.stringify({lat:place.lat,lon:place.lon,saved:Date.now()}));
  },{plan,places});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('button',{name:'Abrir Roma, Italia'}).click();
  await page.locator('.detail-tabs').getByRole('button',{name:'Itinerario'}).click();
  await page.getByRole('button',{name:'Mapa',exact:true}).click();
  await page.getByRole('region',{name:'Mapa de Roma, Italia'}).waitFor({timeout:15000});
  const show=page.getByRole('button',{name:'Mostrar lugares en el mapa'});
  await show.click();
  await page.waitForFunction(()=>document.querySelectorAll('.viaja-destination-marker-label').length===3,{timeout:20000});
  const markers=await page.locator('.viaja-destination-marker-label').evaluateAll(nodes=>nodes.map(node=>({
   number:node.textContent?.trim(),
   background:getComputedStyle(node).backgroundColor,
   color:getComputedStyle(node).color
  })));
  assert.deepEqual(markers.map(m=>m.number),['1','2','3'],name+' destination labels');
  assert.ok(markers.every(m=>m.background==='rgb(21, 84, 64)'&&m.color==='rgb(255, 255, 255)'),name+' pins should be visible');
  assert.equal(await page.locator('.viaja-destination-marker img').count(),0,'No Leaflet PNG icon dependency');
  await page.screenshot({path:dir+'/map-pins-'+name+'-iphone.png',fullPage:true});
  await show.click();
  await page.waitForFunction(()=>document.querySelectorAll('.viaja-destination-marker-label').length===3,{timeout:10000});
  assert.equal(await page.locator('.viaja-destination-marker-label').count(),3,'Repeated click must not duplicate markers');
  assert.deepEqual(errors,[],name+' unexpected JS errors');
  await ctx.close();
  console.log('PASS '+name+' iPhone-sized numbered map pins, CSS colors and overlay replacement');
 }finally{await browser.close()}
}
