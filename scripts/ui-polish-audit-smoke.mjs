import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const BASE='http://127.0.0.1:4173';
const OUTPUT='artifacts/ui-delivery-a/polish';
await mkdir(OUTPUT,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']
});
const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
const luminance=s=>rgb(s).reduce((v,c,i)=>{
 const n=c/255,linear=n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
 return v+linear*[.2126,.7152,.0722][i];
},0);
const ratio=(a,b)=>{
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};
async function selected(locator,label,theme){
 await locator.waitFor({state:'visible'});
 const style=await locator.evaluate(el=>{
  const c=getComputedStyle(el),r=el.getBoundingClientRect();
  // Active navigation on desktop/light may rely on an underline; in that case
  // the effective backdrop is the nearest nontransparent ancestor.
  let bg=c.backgroundColor,p=el.parentElement;
  const transparent=value=>value==='transparent'||/^rgba\(.*,[ ]*0(?:\.0+)?\)$/.test(value);
  while(transparent(bg)&&p){bg=getComputedStyle(p).backgroundColor;p=p.parentElement;}
  return {color:c.color,bg,width:r.width,height:r.height,
   visible:r.width>0&&r.height>0};
 });
 assert.ok(style.visible,label+' must be visible');
 assert.ok(ratio(style.color,style.bg)>=4.5,label+' needs readable selected text: '+JSON.stringify(style));
 if(theme==='dark'){
  assert.ok(luminance(style.bg)<.2,label+' must NOT turn white/light in dark mode: '+style.bg);
 }
 return style;
}
async function overflow(page,label){
 const dims=await page.evaluate(()=>({
  width:document.documentElement.clientWidth,
  scroll:document.documentElement.scrollWidth
 }));
 assert.ok(dims.scroll<=dims.width+1,label+' horizontal overflow: '+JSON.stringify(dims));
}
async function take(page,device,theme,name){
 await page.screenshot({path:OUTPUT+'/'+device+'-'+theme+'-'+name+'.png',fullPage:true});
 await overflow(page,device+' '+theme+' '+name);
}
try{
 for(const device of [
  {name:'iphone-small',width:360,height:780},
  {name:'iphone',width:390,height:844},
  {name:'desktop',width:1280,height:900}
 ]){
  for(const theme of ['dark','light']){
   const ctx=await browser.newContext({
    viewport:{width:device.width,height:device.height},locale:'es-ES',colorScheme:theme
   });
   await ctx.addInitScript(selectedTheme=>{
    localStorage.setItem('viaja-theme',selectedTheme);
    const trip={destination:'Colmar',additionalDestinations:[],origin:'Barcelona',
     start:'2026-11-27',end:'2026-11-30',travelers:2,budget:350,pace:'Equilibrado',
     transport:'Sin coche',sources:[],notes:'',links:'',adjustment:''};
    const plan={id:'ui-polish-colmar',kind:'draft',createdAt:'2026-11-03T00:00:00Z',
     trip,itinerary:[{id:'d1',title:'Colmar a pie',advice:'Pasear',
      activities:[{id:'a1',title:'Casco antiguo',description:'Paseo por Colmar',
       time:'10:00',duration:'1 h',location:'Colmar'}]}],
     expenses:[{id:'e1',label:'Café',category:'Comida',date:'2026-11-28',
      amount:8,currency:'EUR',originalAmount:8,rate:1}]};
    localStorage.setItem('viaja-ai-trips-v1',JSON.stringify([plan]));
   },theme);
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:/Apariencia:/}).waitFor();
   await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,theme);

   // Destination sub-navigation and the editorial guide day tabs.
   const switcher=page.locator('.explore-switch');
   await selected(switcher.locator('button[aria-pressed="true"]'),'Explore active tab',theme);
   await page.getByRole('button',{name:'Viajes compartidos',exact:true}).click();
   await selected(switcher.locator('button[aria-pressed="true"]'),'Community tab',theme);
   await page.getByRole('button',{name:'Guías de Viaja',exact:true}).click();
   const barcelonaCard=page.locator('.visualguides .card').first();
   await barcelonaCard.getByRole('button',{name:/Explorar/}).click();
   const dayButtons=page.locator('.visualguides .tabs button');
   await dayButtons.first().waitFor();
   await selected(dayButtons.filter({hasText:'Día 1'}),'Guide day 1',theme);
   if(await dayButtons.count()>1){
    await dayButtons.nth(1).click();
    await selected(dayButtons.nth(1),'Guide day 2',theme);
   }
   await take(page,device.name,theme,'guide-tabs');

   // Main navigation and journey list filters.
   await page.locator('.topbar nav').getByRole('button',{name:/Mis viajes/}).click();
   await selected(page.locator('.topbar nav button.navactive'),'Main selected nav',theme);
   const journeyTabs=page.locator('.journey-toolbar .filterpills');
   await selected(journeyTabs.locator('button[aria-pressed="true"]'),'Journey filter',theme);
   await journeyTabs.getByRole('button',{name:'Próximo'}).click();
   await selected(journeyTabs.locator('button[aria-pressed="true"]'),'Journey upcoming',theme);
   await journeyTabs.getByRole('button',{name:'Todos'}).click();
   await selected(journeyTabs.locator('button[aria-pressed="true"]'),'Journey all',theme);
   await take(page,device.name,theme,'my-trips');

   // Trip-detail navigation, subviews and expense reset geometry.
   await page.getByRole('button',{name:'Ver viaje →'}).first().click();
   const detailTabs=page.getByRole('navigation',{name:'Secciones del viaje'});
   await selected(detailTabs.locator('[aria-current="page"]'),'Trip summary tab',theme);
   await detailTabs.getByRole('button',{name:'Itinerario'}).click();
   await selected(detailTabs.locator('[aria-current="page"]'),'Trip itinerary tab',theme);
   await selected(page.locator('.day-navigator button[aria-pressed="true"]'),'Selected itinerary day',theme);
   const viewTabs=page.locator('.trip-detail .filterpills');
   await selected(viewTabs.locator('button[aria-pressed="true"]'),'Itinerary view',theme);
   await viewTabs.getByRole('button',{name:'Calendario'}).click();
   await selected(viewTabs.locator('button[aria-pressed="true"]'),'Calendar view',theme);
   await take(page,device.name,theme,'calendar-tabs');
   await detailTabs.getByRole('button',{name:'Gastos'}).click();
   await selected(detailTabs.locator('[aria-current="page"]'),'Trip expenses tab',theme);
   const filters=page.locator('.expense-filters');
   const clear=filters.getByRole('button',{name:'Limpiar filtros de gastos'});
   const category=filters.locator('select');
   const date=filters.locator('input[type="date"]');
   await clear.waitFor();
   const boxes=await Promise.all([category.boundingBox(),date.boundingBox(),clear.boundingBox(),filters.boundingBox()]);
   assert.ok(boxes.every(Boolean),'Expense form controls must be visible');
   const [catBox,dateBox,clearBox,groupBox]=boxes;
   assert.ok(clearBox.width>=96&&clearBox.height>=44,'Clear button needs full-size tap target');
   if(device.width>1100){
    assert.ok(Math.abs(clearBox.y+clearBox.height-(dateBox.y+dateBox.height))<=2,'Clear button must share input baseline on desktop');
    assert.ok(clearBox.x>dateBox.x,'Clear button should be to the right of date on desktop');
   }else{
    assert.ok(clearBox.y>=dateBox.y+dateBox.height-1,'Clear button must be on its own aligned row on mobile');
    assert.ok(Math.abs(clearBox.x+clearBox.width-(groupBox.x+groupBox.width))<=2,
     'Clear button should align with the right edge of expense filters');
   }
   assert.ok(Math.abs(catBox.y+catBox.height-(dateBox.y+dateBox.height))<=2,
    'Category and date controls must share their baseline');
   await category.selectOption({label:'Comida'});
   await date.fill('2026-11-28');
   await clear.click();
   assert.equal(await category.inputValue(),'Todas','Clear resets category');
   assert.equal(await date.inputValue(),'','Clear resets date');
   await take(page,device.name,theme,'expenses-clear');
   assert.deepEqual(errors,[],device.name+' '+theme+' has runtime errors');
   await ctx.close();
   console.log('PASS '+device.name+' '+theme+' nav/guide/trip/calendar selections, expense clear layout and reset, no overflow');
  }
 }
}finally{await browser.close();}
