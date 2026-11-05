import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('artifacts/guided-planner-v2',{recursive:true});
try{
 for(const device of [
  {label:'iphone',width:390,height:844,theme:'light'},
  {label:'iphone-dark',width:390,height:844,theme:'dark'},
  {label:'desktop',width:1440,height:900,theme:'light'},
  {label:'desktop-dark',width:1440,height:900,theme:'dark'}
 ]){
  const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},locale:'es-ES',colorScheme:device.theme});
  if(device.theme==='dark')await ctx.addInitScript(()=>localStorage.setItem('viaja-theme','dark'));
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Planificar/}).click();
  await page.getByRole('heading',{name:'¿A dónde te gustaría viajar?'}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Opciones avanzadas/}).count(),1);
  await page.screenshot({path:'artifacts/guided-planner-v2/'+device.label+'-step1.png',fullPage:true});
  assert.equal(await page.getByRole('button',{name:/Probar ejemplo: Roma/}).count(),0,'No demo preset in public wizard');
  const dest=page.getByRole('combobox',{name:'Destino principal'});
  await dest.fill('Roma, Italia');
  await dest.press('Tab');
  assert.equal(await dest.inputValue(),'Roma, Italia');
  await page.getByRole('button',{name:/Continuar/}).click();
  await page.getByRole('heading',{name:'¿Qué te gusta hacer?'}).waitFor();
  for(const label of ['Historia y monumentos','Gastronomía','Naturaleza']){
   const slider=page.getByRole('slider',{name:label});
   await slider.press('ArrowRight');
   assert.equal(await slider.inputValue(),'3');
  }
  await page.getByRole('button',{name:/Ver más intereses/}).click();
  await page.getByRole('slider',{name:'Vida nocturna'}).press('ArrowLeft');
  assert.equal(await page.getByRole('slider',{name:'Vida nocturna'}).inputValue(),'0');
  const football=page.getByRole('slider',{name:'Fútbol'});
  for(let i=0;i<3;i++)await football.press('ArrowRight');
  assert.equal(await football.inputValue(),'3','Football has a selectable independent priority');
  await page.getByRole('slider',{name:'Deportes',exact:true}).press('ArrowRight');
  assert.equal(await page.getByRole('slider',{name:'Deportes',exact:true}).inputValue(),'2');
  await page.screenshot({path:'artifacts/guided-planner-v2/'+device.label+'-step2.png',fullPage:true});
  await page.getByRole('button',{name:/Continuar/}).click();
  await page.getByRole('heading',{name:'¿Cómo te gusta viajar?'}).waitFor();
  assert.equal(await page.getByRole('button',{name:/En pareja/}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('spinbutton',{name:/¿Cuántas personas/}).count(),0,'Couple group must not have an editable traveler count');
  await page.getByRole('button',{name:'Solo/a'}).click();
  await page.getByText(/1 viajero · viajás solo\/a/).waitFor();
  assert.equal(await page.getByRole('spinbutton',{name:/¿Cuántas personas/}).count(),0,'Solo party must have exactly one fixed traveler');
  await page.getByRole('button',{name:'En familia'}).click();
  const familyCount=page.getByRole('spinbutton',{name:/¿Cuántas personas/});
  assert.equal(await familyCount.getAttribute('min'),'3');
  await familyCount.fill('5');
  await page.getByRole('button',{name:'Con amigos'}).click();
  const friendsCount=page.getByRole('spinbutton',{name:/¿Cuántas personas/});
  assert.equal(await friendsCount.getAttribute('min'),'2');
  await friendsCount.fill('4');
  await page.getByRole('button',{name:'En pareja'}).click();
  assert.equal(await page.getByRole('spinbutton',{name:/¿Cuántas personas/}).count(),0);
  await page.getByText(/2 viajeros · viajás en pareja/).waitFor();
  await page.getByText('Ajustar horarios disponibles por día').click();
  await page.locator('.wizard-time-row').first().locator('input[type="time"]').first().fill('12:00');
  await page.getByRole('button',{name:/Continuar/}).click();
  await page.getByRole('heading',{name:'Este es tu viaje'}).waitFor();
  assert.match(await page.locator('.wizard-summary').innerText(),/Roma, Italia/);
  assert.match(await page.locator('.wizard-summary').innerText(),/3 días/);
  await page.screenshot({path:'artifacts/guided-planner-v2/'+device.label+'-summary.png',fullPage:true});
  await page.getByRole('button',{name:/Crear mi viaje con guía o agenda/}).click();
  await page.waitForFunction(()=>{
   const v=localStorage.getItem('viaja-ai-trips-v1');
   try {const arr=JSON.parse(v||'[]');return Array.isArray(arr)&&arr.some(p=>p.trip?.destination==='Roma, Italia'&&p.itinerary?.length===3);}catch{return false}
  },{timeout:8000});
  const model=await page.evaluate(()=>{
   const trips=JSON.parse(localStorage.getItem('viaja-ai-trips-v1')||'[]');
   return trips.find(p=>p.trip.destination==='Roma, Italia');
  });
  assert.equal(model.trip.preferences.interests.history,3);
  assert.equal(model.trip.preferences.interests.food,3);
  assert.equal(model.trip.preferences.interests.nature,3);
  assert.equal(model.trip.preferences.interests.nightlife,0);
  assert.equal(model.trip.preferences.interests.football,3);
  assert.equal(model.trip.preferences.interests.sports,2);
  assert.equal(model.trip.travelers,2,'Back to couple must reset party to exactly two');
  assert.equal(model.trip.preferences.dayTimes[0].start,'12:00');
  assert.equal(model.itinerary.length,3);
  assert.ok(model.itinerary.every(d=>d.activities.length>0),'Rome draft must not start with empty days');
  await page.getByRole('button',{name:/Planificar/}).click();
  await page.getByRole('button',{name:/Opciones avanzadas/}).click();
  await page.getByRole('heading',{name:'Contanos tu próximo viaje'}).waitFor();
  const legacy=page.locator('.formcard');assert.ok(await legacy.isVisible(),'Legacy advanced planner must remain accessible');
  await page.locator('.topbar nav button').filter({hasText:'Mis viajes'}).click();
  if(device.theme==='dark'){
   const active=page.locator('.topbar nav button.navactive');
   const actual=await active.evaluate(el=>({background:getComputedStyle(el).backgroundColor,
    height:Math.round(el.getBoundingClientRect().height),line:getComputedStyle(el,'::after').backgroundColor}));
   assert.equal(actual.background,'rgb(38, 62, 52)','Selected dark nav tab should be visually subdued');
   const selectedDimensions=await active.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
   await active.hover();
   const selectedHovered=await active.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
   assert.deepEqual(selectedHovered,selectedDimensions,'Selected hover changed tab box size');
   const otherTab=page.getByRole('button',{name:/Planificar/});
   const idleDimensions=await otherTab.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
   await otherTab.hover();
   const unselectedHovered=await otherTab.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
   assert.deepEqual(unselectedHovered,idleDimensions,'Unselected hover changed tab box size');
   assert.equal(Math.round(selectedHovered.height),Math.round(unselectedHovered.height),'Selected and hovered nav tabs must have equal height');
   assert.ok(actual.height<=58,'Active dark tab must not fill full desktop navigation');
   if(device.width>700)assert.equal(actual.line,'rgb(167, 216, 186)','Active nav underline should use a soft accent');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=2,'Unexpected horizontal overflow '+device.label+': '+overflow);
  assert.deepEqual(errors,[],'No runtime errors');
  console.log('PASS '+device.label+' guided wizard, sample, local itinerary, editable advanced mode, no overflow');
  await ctx.close();
 }
 // UI-only authenticated fixture: no real credentials or private data.
 const signed=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'dark'});
 await signed.addInitScript(()=>{
   localStorage.setItem('viaja-theme','dark');
   localStorage.setItem('viaja-auth-session-v1',JSON.stringify({
    access_token:'test-only',refresh_token:'test-only',expires_at:Math.floor(Date.now()/1000)+3600,
    user:{id:'11111111-1111-4111-8111-111111111111',email:'viaja-ui-test@example.invalid'}
   }));
 });
 await signed.route('**/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'11111111-1111-4111-8111-111111111111',email:'viaja-ui-test@example.invalid'})}));
 await signed.route('**/rest/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await signed.route('**/api/status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ready:true,admin:true,reason:'ready',mode:'ideas_without_search'})}));
 const signedPage=await signed.newPage();
 await signedPage.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await signedPage.getByRole('button',{name:'Opciones de mi cuenta'}).waitFor();
 await signedPage.getByRole('button',{name:'Administración'}).waitFor();
 const nav=signedPage.locator('.topbar nav button');
 assert.equal(await nav.count(),5,'Signed-in fixture must show 5 tabs');
 for(let i=0;i<5;i++){
  const button=nav.nth(i);
  const box=()=>button.evaluate(el=>({w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));
  const initial=await box();
  await button.hover();
  assert.deepEqual(await box(),initial,'Signed-in hover resized nav tab '+i);
  await button.click();
  assert.deepEqual(await box(),initial,'Signed-in selected tab resized nav tab '+i);
  assert.equal(initial.h,50,'Nav tabs must have uniform 50px height');
 }
 await signedPage.screenshot({path:'artifacts/guided-planner-v2/signed-in-dark-tabs.png',fullPage:false});
 await signed.close();
 console.log('PASS simulated signed-in nav: same dimensions in idle, hover and active states');
}finally{await browser.close()}
