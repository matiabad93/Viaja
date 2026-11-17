import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const BASE='http://127.0.0.1:4173';
const DIR='artifacts/premium-experience';
await mkdir(DIR,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']
});
async function checkOverflow(page,label){
 const dimensions=await page.evaluate(()=>({
  client:document.documentElement.clientWidth,
  scroll:document.documentElement.scrollWidth
 }));
 assert.ok(dimensions.scroll<=dimensions.client+1,label+' overflow: '+JSON.stringify(dimensions));
}
try{
 for(const device of [
  {label:'iphone-small',width:360,height:780},
  {label:'iphone',width:390,height:844},
  {label:'desktop',width:1280,height:900}
 ]){
  for(const scheme of ['light','dark']){
   const ctx=await browser.newContext({
    viewport:{width:device.width,height:device.height},
    colorScheme:scheme,locale:'es-ES'
   });
   await ctx.addInitScript(theme=>localStorage.setItem('viaja-theme',theme),scheme);
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(BASE,{waitUntil:'domcontentloaded'});
   const menu=page.getByRole('button',{name:/Apariencia:/});
   await menu.waitFor();
   await page.getByRole('heading',{name:/Todo gran viaje empieza con una idea/}).waitFor();
   await checkOverflow(page,device.label+' '+scheme+' home');
   const section=page.locator('main#main-content');
   assert.equal(await section.getAttribute('tabindex'),'-1');
   await menu.click();
   const comfort=page.getByRole('menuitemcheckbox',{name:'Lectura cómoda'});
   await comfort.waitFor();
   assert.equal(await comfort.getAttribute('aria-checked'),'false');
   await comfort.click();
   assert.equal(await page.locator('html').getAttribute('data-comfort'),'on');
   assert.equal(await menu.getAttribute('aria-expanded'),'false');
   assert.equal(await page.evaluate(()=>localStorage.getItem('viaja-comfort-reading')),'on');
   const bodySize=await page.evaluate(()=>parseFloat(getComputedStyle(document.body).fontSize));
   assert.ok(bodySize>=16,'Comfort reading must offer 16px body text, got '+bodySize);
   const nav=page.getByRole('navigation',{name:'Navegación principal'});
   const navButtons=nav.getByRole('button');
   const targets=await navButtons.evaluateAll(buttons=>buttons.slice(0,5).map(b=>({
    text:b.textContent?.trim(),height:b.getBoundingClientRect().height
   })));
   assert.ok(targets.every(target=>target.height>=44),device.label+' nav targets: '+JSON.stringify(targets));
   await checkOverflow(page,device.label+' '+scheme+' comfort');
   await page.screenshot({path:DIR+'/'+device.label+'-'+scheme+'-comfort-home.png',fullPage:true});

   const planner=nav.getByRole('button',{name:/Planificar/});
   await planner.click();
   await page.getByRole('heading',{name:'¿A dónde te gustaría viajar?'}).waitFor({timeout:12000});
   assert.equal(await planner.getAttribute('aria-current'),'page');
   await page.waitForFunction(()=>document.title.includes('Planificar'));
   await checkOverflow(page,device.label+' '+scheme+' planner');
   await page.screenshot({path:DIR+'/'+device.label+'-'+scheme+'-planner.png',fullPage:true});

   const reservations=nav.getByRole('button',{name:'Reservas'});
   await reservations.click();
   await page.getByRole('heading',{name:/Tus reservas, siempre a mano/}).waitFor({timeout:12000});
   assert.equal(await reservations.getAttribute('aria-current'),'page');
   assert.equal(await page.locator('.reservation-search-toolbar').count(),0,'No guest-only filters');
   assert.equal(await page.locator('.reservation-overview').count(),0,'No misleading zero counters for guests');
   await checkOverflow(page,device.label+' '+scheme+' reservations');
   await page.screenshot({path:DIR+'/'+device.label+'-'+scheme+'-reservations.png',fullPage:true});

   await page.reload({waitUntil:'domcontentloaded'});
   await menu.waitFor();
   assert.equal(await page.locator('html').getAttribute('data-comfort'),'on','Comfort preference persists');
   await menu.click();
   await comfort.click();
   assert.equal(await page.locator('html').getAttribute('data-comfort'),'off');
   await menu.click();
   await page.keyboard.press('ArrowDown');
   assert.equal(await page.locator('.theme-menu [role="menuitemradio"]').nth(1).evaluate(el=>el===document.activeElement),true);
   await page.keyboard.press('Escape');
   assert.equal(await menu.getAttribute('aria-expanded'),'false');
   assert.equal(await menu.evaluate(el=>el===document.activeElement),true);
   assert.deepEqual(errors,[],device.label+' '+scheme+' JS errors');
   await ctx.close();
  }
 }
 // A person requesting reduced motion must not see hover animations.
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:/Todo gran viaje empieza con una idea/}).waitFor();
 const transition=await page.locator('.home-shortcut').first().evaluate(el=>getComputedStyle(el).transitionDuration);
 assert.ok(transition.split(',').every(v=>parseFloat(v)===0),'Reduced motion should disable transitions: '+transition);
 await ctx.close();
 console.log('PASS Etapa 7 · mobile, desktop, light/dark, comfort, keyboard, route, reduced motion');
}finally{
 await browser.close();
}
