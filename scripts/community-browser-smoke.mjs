import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-smoke/node_modules/playwright/index.mjs';
const origin='http://127.0.0.1:4173';
const example={
 id:'abcdef12-1234-4123-9123-abcdefabcdef',title:'Colmar y Alsacia',destination:'Colmar, Francia',
 days_count:3,pace:'Intenso',transport:'Sin coche',published_at:'2026-11-02T08:00:00Z',
 content:{route:['Colmar, Francia','Estrasburgo, Francia'],days:[
 {title:'Día 1 · Colmar',advice:'Organizar mercados y barrios cercanos',activities:[{title:'Petite Venise',description:'Recorrer los canales',time:'10:00',location:'Colmar'}]},
 {title:'Día 2 · Estrasburgo',activities:[{title:'Catedral de Estrasburgo',description:'Visitar la plaza',time:'11:00'}]},
 {title:'Día 3 · Regreso',activities:[]}
 ]}
};
await mkdir('artifacts/v1-mobile-ux',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const viewport of [{width:390,height:844,name:'mobile'},{width:1280,height:900,name:'desktop'}]){
  const ctx=await browser.newContext({viewport,locale:'es-ES'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/community_trips?*',route=>route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify(route.request().url().includes('id=eq.')?[example]:[example])}));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  // Public journeys are a new Explore category; existing editorial guides remain default.
  await page.getByRole('button',{name:'Viajes compartidos'}).click();
  await page.getByRole('heading',{name:'Ideas que se comparten.'}).waitFor({state:'visible'});
  await page.getByRole('heading',{name:'Colmar y Alsacia'}).waitFor({state:'visible'});
  await page.getByRole('textbox',{name:'Buscar viajes compartidos'}).fill('Mad');
  await page.getByText('No encontramos ese recorrido.').waitFor({state:'visible'});
  await page.getByRole('textbox',{name:'Buscar viajes compartidos'}).fill('Colmar');
  await page.getByRole('button',{name:/Ver itinerario y copiarlo/}).click();
  await page.getByText('Petite Venise').waitFor({state:'visible'});
  assert.equal(await page.getByText('Barcelona, España').count(),0,'Never expose private departure');
  assert.equal(await page.getByText('1.234 €').count(),0,'Never expose budget');
  await page.getByRole('button',{name:/Guardar una copia editable/}).click();
  await page.getByRole('heading',{name:/Colmar, Francia/}).first().waitFor({state:'visible'});
  const plans=await page.evaluate(()=>JSON.parse(localStorage.getItem('viaja-ai-trips-v1')||'[]'));
  assert.ok(plans.some(p=>p.trip.destination==='Colmar, Francia'&&p.trip.origin===''&&p.trip.start===''&&p.itinerary?.length===3),'Community copy is independent and undated');
  assert.equal(errors.length,0,'No browser exceptions: '+errors.join('; '));
  await page.screenshot({path:'artifacts/v1-mobile-ux/community-'+viewport.name+'.png',fullPage:true});
  await ctx.close();
  console.log('PASS '+viewport.name+' public discovery, filters, read-only itinerary and safe local copy');
 }
}finally{await browser.close()}
