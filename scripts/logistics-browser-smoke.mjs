import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const base=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
const engine=process.env.VIAJA_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(engine===chromium?{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
const devices=[{name:'phone320',width:320,height:720,theme:'dark'},{name:'iphone375',width:375,height:812,theme:'dark'},{name:'iphone390',width:390,height:844,theme:'dark'},{name:'tablet768',width:768,height:1024,theme:'light'},{name:'desktop1280',width:1280,height:900,theme:'light'}];
await mkdir('artifacts/logistics-b',{recursive:true});
const sample={
 id:'11111111-1111-4111-8111-111111111111',kind:'draft',createdAt:'2026-11-04T00:00:00Z',
 trip:{destination:'Colmar',additionalDestinations:[],origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:300,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:[]},
 itinerary:[{id:'d1',title:'Casco antiguo',activities:[{id:'a1',title:'Mercado',description:'Pasear',time:'10:00',duration:'1 h'}]}],
 expenses:[]
};
const overflow=async page=>{
 const scroll=await page.evaluate(()=>({client:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
 assert.ok(scroll.content<=scroll.client+1,'Page overflows: '+JSON.stringify(scroll));
};
try{
 for(const device of devices){
  const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},locale:'es-ES',colorScheme:device.theme,acceptDownloads:true});
  await ctx.addInitScript(({plan,theme})=>{
   localStorage.setItem('viaja-theme',theme);
   if(!localStorage.getItem('viaja-ai-trips-v1'))localStorage.setItem('viaja-ai-trips-v1',JSON.stringify([plan]));
  },{plan:sample,theme:device.theme});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('button',{name:'Ver viaje →'}).click();
  const tabs=page.getByRole('navigation',{name:'Secciones del viaje'});
  assert.equal(await tabs.getByRole('button').count(),5,'Five trip tabs expected');
  await tabs.getByRole('button',{name:'Logística'}).click();
  await page.getByRole('heading',{name:'La logística de tu viaje'}).waitFor();
  assert.ok(await page.getByText('Los archivos llegan en la Entrega C.').isVisible());
  await overflow(page);
  // Persist accommodation with a private reference.
  const lodgingSection=page.locator('.logistics-block').filter({has:page.getByRole('heading',{name:'Alojamientos'})});
  await lodgingSection.getByRole('button',{name:'Agregar',exact:true}).click();
  const aForm=page.getByRole('form',{name:'Nuevo alojamiento'});
  await aForm.getByRole('textbox',{name:'Nombre del alojamiento'}).fill('Hotel Noël');
  await aForm.getByRole('textbox',{name:'Dirección'}).fill('5 Rue de Paris, Colmar');
  await aForm.locator('input[type=date]').nth(0).fill('2026-11-27');
  await aForm.locator('input[type=date]').nth(1).fill('2026-11-30');
  await aForm.getByLabel('Zona horaria IANA').fill('Europe/Paris');
  await aForm.getByRole('button',{name:'Guardar alojamiento'}).click();
  await page.getByRole('heading',{name:'Hotel Noël'}).waitFor();
  // Persist a transport segment with separate IANA zones.
  const transportSection=page.locator('.logistics-block').filter({has:page.getByRole('heading',{name:'Transportes'})});
  await transportSection.getByRole('button',{name:'Agregar',exact:true}).click();
  const tForm=page.getByRole('form',{name:'Nuevo transporte'});
  await tForm.getByRole('textbox',{name:'Origen'}).fill('Barcelona');
  await tForm.getByRole('textbox',{name:'Destino'}).fill('Basilea');
  await tForm.locator('input[type="datetime-local"]').nth(0).fill('2026-11-27T16:30');
  await tForm.locator('input[type="datetime-local"]').nth(1).fill('2026-11-27T18:20');
  await tForm.getByLabel('Zona horaria de salida').fill('Europe/Madrid');
  await tForm.getByLabel('Zona horaria de llegada').fill('Europe/Paris');
  await tForm.getByRole('button',{name:'Guardar transporte'}).click();
  await page.getByRole('heading',{name:/Barcelona → Basilea/}).waitFor();
  // Export a real ICS without private confirmation data.
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Exportar reservas'}).click()]);
  assert.match(download.suggestedFilename(),/\.ics$/i);
  const ics=await readFile(await download.path(),'utf8');
  assert.ok(ics.includes('BEGIN:VCALENDAR')&&ics.includes('20261127T153000Z'));
  // No automatic financial entries: only user-initiated linking.
  await page.locator('.accommodation-card').getByRole('button',{name:'Vincular gasto'}).click();
  const linkPanel=page.getByRole('region',{name:'Vincular gasto'});
  await linkPanel.getByRole('spinbutton',{name:'Importe en EUR'}).fill('85.50');
  await linkPanel.getByRole('button',{name:'Crear gasto y vincular'}).click();
  assert.ok(await page.locator('.accommodation-card').getByText(/Gasto vinculado/).isVisible());
  await tabs.getByRole('button',{name:'Gastos'}).click();
  assert.ok(await page.getByText('85,50').first().isVisible(),'Manual expense should be visible');
  await tabs.getByRole('button',{name:'Resumen'}).click();
  assert.ok(await page.getByText('Información, preferencias y fuentes del viaje').isVisible());
  await page.screenshot({path:'artifacts/logistics-b/'+device.name+'-'+device.theme+'.png',fullPage:true});
  await overflow(page);
  // Logged-out data must survive page refresh. Existing trip must not be overwritten.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('button',{name:'Ver viaje →'}).click();
  await page.getByRole('navigation',{name:'Secciones del viaje'}).getByRole('button',{name:'Logística'}).click();
  assert.ok(await page.getByRole('heading',{name:'Hotel Noël'}).isVisible());
  assert.ok(await page.getByRole('heading',{name:/Barcelona → Basilea/}).isVisible());
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('viaja-ai-trips-v1')||'[]')[0]);
  assert.equal(saved.logistics.accommodations.length,1);
  assert.equal(saved.logistics.transports.length,1);
  assert.equal(saved.expenses.length,1);
  // Full CRUD: edit lodging, add a second stay, cancel it and remove it.
  await page.locator('.accommodation-card').first().getByRole('button',{name:'Editar'}).click();
  const editForm=page.getByRole('form',{name:'Editar alojamiento'});
  await editForm.getByRole('textbox',{name:'Nombre del alojamiento'}).fill('Hotel Noël revisado');
  await editForm.getByRole('button',{name:'Guardar alojamiento'}).click();
  assert.ok(await page.getByRole('heading',{name:'Hotel Noël revisado'}).isVisible());
  const lodgings=page.locator('.logistics-block').filter({has:page.getByRole('heading',{name:'Alojamientos'})});
  await lodgings.getByRole('button',{name:'Agregar',exact:true}).click();
  const extra=page.getByRole('form',{name:'Nuevo alojamiento'});
  await extra.getByRole('textbox',{name:'Nombre del alojamiento'}).fill('Segundo alojamiento');
  await extra.getByRole('textbox',{name:'Dirección'}).fill('Rue des Marchands');
  await extra.locator('input[type=date]').nth(0).fill('2026-11-28');
  await extra.locator('input[type=date]').nth(1).fill('2026-11-29');
  await extra.getByRole('button',{name:'Guardar alojamiento'}).click();
  assert.equal(await page.locator('.accommodation-card').count(),2);
  const extraCard=page.locator('.accommodation-card').filter({has:page.getByRole('heading',{name:'Segundo alojamiento'})});
  await extraCard.getByRole('button',{name:'Cancelar reserva'}).click();
  await page.getByRole('button',{name:'Marcar cancelada'}).click();
  assert.ok(await extraCard.getByText('Cancelado').isVisible());
  await extraCard.getByRole('button',{name:'Eliminar alojamiento Segundo alojamiento'}).click();
  await page.getByRole('button',{name:'Eliminar reserva'}).click();
  assert.equal(await page.locator('.accommodation-card').count(),1);
  assert.ok(await page.getByRole('heading',{name:'Hotel Noël revisado'}).isVisible());
  const raw=await page.evaluate(()=>JSON.parse(localStorage.getItem('viaja-ai-trips-v1')||'[]')[0]);
  assert.equal(raw.logistics.accommodations.length,1);
  assert.equal(raw.expenses.length,1,'Deleting a reservation must preserve manual expenses');
  // The viewer role is enforced in UI; server-side save RPC separately rejects viewers.
  await page.evaluate(()=>{
   const trips=JSON.parse(localStorage.getItem('viaja-ai-trips-v1')||'[]');
   trips[0].collaboration={ownerId:'22222222-2222-4222-8222-222222222222',version:2,role:'viewer',memberCount:2};
   localStorage.setItem('viaja-ai-trips-v1',JSON.stringify(trips));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('button',{name:'Ver viaje →'}).click();
  await page.getByRole('navigation',{name:'Secciones del viaje'}).getByRole('button',{name:'Logística'}).click();
  assert.ok(await page.getByRole('heading',{name:'Hotel Noël revisado'}).isVisible());
  assert.equal(await page.locator('.logistics-block').getByRole('button',{name:'Agregar',exact:true}).count(),0,'Viewers cannot add private reservations');
  assert.equal(await page.locator('.accommodation-card').getByRole('button',{name:'Editar',exact:true}).count(),0,'Viewers cannot edit private reservations');
  await overflow(page);
  assert.deepEqual(errors,[],'Client errors in '+device.name);
  await ctx.close();
  console.log('PASS '+device.name+' '+device.theme+' logistics CRUD, calendar export, manual expense and persistence');
 }
}finally{await browser.close()}
