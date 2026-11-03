import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const base='http://127.0.0.1:4173';
await mkdir('artifacts/ui-delivery-a/dark-fixes',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const colors={darkField:'rgb(30, 48, 41)',darkSurface:'rgb(34, 52, 45)'};
function luminance(rgb){
 const matches=rgb.match(/[\d.]+/g)||[];
 const channels=matches.slice(0,3).map(v=>{const n=Number(v)/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});
 return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(foreground,background){
 const a=luminance(foreground),b=luminance(background);
 return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
const selectedTab=async(locator)=>{
 await locator.waitFor({state:'visible'});
 const style=await locator.evaluate(el=>{
  const root=getComputedStyle(document.documentElement),paint=getComputedStyle(el);
  return {bg:paint.backgroundColor,fg:paint.color,target:root.getPropertyValue('--tab-selected-bg').trim()};
 });
 assert.ok(style.target,'Selected tab token is absent');
 const expected=await locator.evaluate(el=>{
  const probe=document.createElement('span');
  probe.style.background=getComputedStyle(document.documentElement).getPropertyValue('--tab-selected-bg');
  document.body.appendChild(probe);
  const result=getComputedStyle(probe).backgroundColor;
  probe.remove();
  return result;
 });
 assert.equal(style.bg,expected,'Selected tab uses inconsistent background: '+style.bg);
 assert.ok(contrast(style.fg,style.bg)>=4.5,'Selected tab lacks AA text contrast: '+style.fg+' '+style.bg);
};
const inset=async(parent,child,min=16)=>{
 const bounds=await parent.boundingBox(),item=await child.boundingBox();
 assert.ok(bounds&&item,'Panel and content must have measurable bounds');
 assert.ok(item.x-bounds.x>=min && bounds.x+bounds.width-item.x-item.width>=min,'Missing horizontal inset on '+(await parent.getAttribute('class')));
 assert.ok(item.y-bounds.y>=min && bounds.y+bounds.height-item.y-item.height>=min,'Missing vertical inset on '+(await parent.getAttribute('class')));
};
try{
 for(const device of [{label:'iphone',width:390,height:844},{label:'desktop',width:1280,height:900}]){
  const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},locale:'es-ES',colorScheme:'dark'});
  await ctx.addInitScript(()=>{
   localStorage.setItem('viaja-theme','dark');
   const trip={destination:'Colmar',additionalDestinations:[],origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',sources:[],notes:'',links:'',adjustment:''};
   localStorage.setItem('viaja-ai-trips-v1',JSON.stringify([{id:'visual-colmar',kind:'draft',createdAt:'2026-11-03T00:00:00Z',trip,itinerary:[{id:'dia',title:'Centro',advice:'Recorrer a pie',activities:[{id:'plaza',title:'Plaza',description:'Paseo',time:'10:00',duration:'1 h'}]}]}]));
  });
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Apariencia:/}).waitFor();
  await page.getByRole('button',{name:/Planificar/}).click();
  await page.getByRole('heading',{name:'Contanos tu próximo viaje'}).waitFor();
  await inset(page.locator('.formcard'),page.locator('.formcard .formtitle'));

  const styles=await page.evaluate(()=>{
   const find=selector=>{const el=document.querySelector(selector);if(!el)throw Error('Elemento ausente: '+selector);return el;};
   const css=el=>getComputedStyle(el);
   const pane=find('.trip-stops-editor');
   const heading=find('.trip-stops-heading strong');
   const date=find('.trip-date-field .date-trigger');
   const dateText=find('.trip-date-label');
   const day=Array.from(document.querySelectorAll('.formcard .inputicon > input[type="number"]'));
   return {
    panelBackground:css(pane).backgroundColor,panelText:css(heading).color,
    dateBackground:css(date).backgroundColor,dateColor:css(date).color,dateLabel:css(dateText).color,
    numeric:day.map(input=>{
     const icon=input.parentElement?.querySelector(':scope > svg');
     if(!icon)throw Error('Input numerico sin icono');
     const inputBox=input.getBoundingClientRect(), iconBox=icon.getBoundingClientRect();
     return {padding:parseFloat(css(input).paddingLeft),inputX:inputBox.x,iconRight:iconBox.right,
       textStart:inputBox.left+parseFloat(css(input).paddingLeft),inputForeground:css(input).color,
       inputBackground:css(input).backgroundColor};
    })
   };
  });
  assert.notEqual(styles.panelBackground,'rgb(248, 250, 245)','The route panel cannot stay white in dark mode');
  assert.ok(contrast(styles.panelText,styles.panelBackground)>=4.5,'Route heading needs AA contrast');
  assert.ok(contrast(styles.dateColor,styles.dateBackground)>=4.5,'Date button needs AA contrast');
  assert.ok(contrast(styles.dateLabel,styles.panelBackground)>=4.5||contrast(styles.dateLabel,'rgb(27, 41, 37)')>=4.5,'Date labels must be readable');
  assert.equal(styles.numeric.length,2,'Traveler and budget inputs have visible decorative icons');
  for(const input of styles.numeric){
   assert.ok(input.textStart>=input.iconRight+8,'Input text overlaps left icon, gap='+String(input.textStart-input.iconRight));
   assert.ok(contrast(input.inputForeground,input.inputBackground)>=4.5,'Numbers need AA contrast');
  }
  const traveler=page.getByRole('spinbutton',{name:'Viajeros'});
  await traveler.fill('3');
  assert.equal(await traveler.inputValue(),'3');
  await page.getByRole('button',{name:'Fecha de salida'}).click();
  const popup=page.getByRole('dialog',{name:'Elegir fecha de salida'});
  await popup.waitFor();
  const popupStyle=await popup.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,head:getComputedStyle(el.querySelector('.trip-calendar-top strong')).color}));
  assert.ok(contrast(popupStyle.head,popupStyle.bg)>=4.5,'Calendar popup title requires AA contrast');
  await page.screenshot({path:'artifacts/ui-delivery-a/dark-fixes/'+device.label+'-planner.png',fullPage:true});
  await page.getByRole('button',{name:'Cerrar calendario'}).click();

  const navDebug=await page.evaluate(()=>{
   const target=[...document.querySelectorAll('nav button')].find(el=>el.textContent?.includes('Mis viajes'));
   const theme=document.querySelector('.theme-trigger');
   if(!target||!theme)return {error:'no target/theme'};
   const t=target.getBoundingClientRect(),m=theme.getBoundingClientRect();
   const nav=target.closest('nav');
   const navRect=nav.getBoundingClientRect();
   const navCSS=getComputedStyle(nav);
   const header=target.closest('header');
   const headerCSS=getComputedStyle(header);
   const hit=document.elementFromPoint(t.x+t.width/2,t.y+t.height/2);
   return {target:{x:t.x,y:t.y,width:t.width,height:t.height},theme:{x:m.x,y:m.y,width:m.width,height:m.height},nav:{y:navRect.y,height:navRect.height,position:navCSS.position,top:navCSS.top,bottom:navCSS.bottom,display:navCSS.display},header:{transform:headerCSS.transform,filter:headerCSS.filter,backdrop:headerCSS.backdropFilter,position:headerCSS.position},viewport:window.innerHeight,interceptor:hit?.outerHTML?.slice(0,150),scrollY:window.scrollY};
  });
  console.log('NAV_DIAG '+device.label+': '+JSON.stringify(navDebug));
  await page.getByRole('button',{name:/Mis viajes/}).click({timeout:5000});
  const search=page.getByRole('textbox',{name:'Buscar mis viajes'});
  await search.waitFor();
  await inset(page.locator('.journey-content').first(),page.locator('.journey-content h2').first());
  const searchStyle=await search.evaluate(el=>({
   outer:getComputedStyle(el.parentElement).backgroundColor,
   inner:getComputedStyle(el).backgroundColor,
   value:getComputedStyle(el).color,
   outerBorder:getComputedStyle(el.parentElement).borderColor
  }));
  assert.notEqual(searchStyle.outer,'rgb(255, 255, 255)','My Trips search outer container must not be white');
  assert.ok(contrast(searchStyle.value,searchStyle.outer)>=4.5,'My Trips search text needs AA contrast');
  await selectedTab(page.locator('.topbar nav button.navactive'));
  const savedFilters=page.locator('.journey-toolbar .filterpills');
  await selectedTab(savedFilters.locator('button[aria-pressed="true"]'));
  await savedFilters.getByRole('button',{name:'Finalizado'}).click();
  await selectedTab(savedFilters.locator('button[aria-pressed="true"]'));
  await savedFilters.getByRole('button',{name:'Todos'}).click();
  await search.fill('Colmar');
  await page.screenshot({path:'artifacts/ui-delivery-a/dark-fixes/'+device.label+'-my-trips.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1,'No horizontal overflow');
  await page.getByRole('button',{name:'Planificar',exact:true}).click();
  await selectedTab(page.locator('.topbar nav button.navactive'));
  const example=page.getByRole('button',{name:'Probar con Madrid'});
  const readable=async(locator,background=locator)=>{
   const fg=await locator.evaluate(el=>getComputedStyle(el).color);
   const bg=await background.evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.ok(contrast(fg,bg)>=4.5,'Insufficient contrast: '+fg+' on '+bg);
  };
  await readable(example);
  await example.click();
  assert.equal(await page.getByRole('combobox',{name:'Destino principal'}).inputValue(),'Madrid, España');
  assert.ok(await page.getByRole('button',{name:'Agregar otro destino'}).isEnabled());
  await readable(page.locator('.example-open'));
  await page.getByRole('button',{name:/Abrir guía de Madrid/}).click();
  await page.getByRole('heading',{name:'Madrid imprescindible',exact:true}).waitFor();
  await page.getByRole('button',{name:/Todas las guías/}).click();
  const parisCard=page.locator('.visualguides article').filter({has:page.getByRole('heading',{name:'París',exact:true})});
  await inset(parisCard.locator('.cardbody'),parisCard.locator('.cardbody h3'));
  await parisCard.getByRole('button',{name:/Explorar/}).click();
  await selectedTab(page.locator('.visualguides .tabs button[aria-pressed="true"]'));
  await page.screenshot({path:'artifacts/ui-delivery-a/dark-fixes/'+device.label+'-guide-selected.png'});
  const panel=page.locator('.guidehead');
  await inset(panel,panel.locator('h1'));
  await inset(panel,panel.locator('.stop').first());
  await inset(panel,panel.getByRole('button',{name:/Usar este itinerario/}));
  const mapPanel=page.locator('.viaja-map-section');
  await inset(mapPanel,mapPanel.locator('.viaja-map-toolbar'));
  await inset(mapPanel,mapPanel.locator('.viaja-osm-map'));
  await inset(mapPanel,mapPanel.locator('.viaja-map-stop').first());
  const zoomIn=mapPanel.locator('.leaflet-control-zoom-in');
  const zoomOut=mapPanel.locator('.leaflet-control-zoom-out');
  for(const control of [zoomIn,zoomOut]){
   await control.waitFor();
   await readable(control.locator('span'),control);
   const box=await control.boundingBox();
   assert.ok(box.width>=44 && box.height>=44);
   const mapBounds=await mapPanel.locator('.viaja-osm-map').boundingBox();
   assert.ok(box.x-mapBounds.x>=14 && box.y-mapBounds.y>=14,'Zoom buttons need a visible inset from map edges');
   await control.focus();
   await readable(control.locator('span'),control);
   await control.click();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1,'Guide map overflows viewport');
  await page.getByRole('button',{name:/Mis viajes/}).first().click();
  const badge=page.locator('.topbar nav small');
  assert.equal(await badge.innerText(),'1');
  assert.ok(await badge.isVisible());
  const paint=el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor});
  const badgePaint=await badge.evaluate(paint);
  assert.ok(contrast(badgePaint.fg,badgePaint.bg)>=4.5);
  await page.getByRole('button',{name:'Ver viaje →'}).click();
  await inset(page.locator('.trip-detail'),page.locator('.trip-banner'));
  await page.getByRole('navigation',{name:'Secciones del viaje'}).getByRole('button',{name:'Itinerario'}).click();
  await selectedTab(page.locator('.detail-tabs button[aria-current="page"]'));
  await selectedTab(page.locator('.day-navigator button[aria-pressed="true"]'));
  await selectedTab(page.locator('.trip-detail .filterpills button[aria-pressed="true"]'));
  await readable(page.locator('.day-practical-guide strong'),page.locator('.day-practical-guide'));
  await readable(page.locator('.activity-tags span').first());
  await inset(page.locator('.agenda .activity-card').first(),page.locator('.agenda .activity-card .activity-body').first());
  await readable(page.locator('.day-navigator [aria-pressed=true]').first());
  await page.getByRole('button',{name:'Calendario',exact:true}).click();
  await selectedTab(page.locator('.trip-detail .filterpills button[aria-pressed="true"]'));
  await inset(page.locator('.calendar-timeline'),page.locator('.calendar-intro'));
  await readable(page.locator('.calendar-intro p'),page.locator('.calendar-intro'));
  await readable(page.locator('.calendar-slot strong').first(),page.locator('.calendar-slot').first());
  await page.getByRole('button',{name:'Gastos',exact:true}).click();
  await inset(page.locator('.finance-grid .surface').first(),page.locator('.finance-grid .surface h3').first());
  await selectedTab(page.locator('.detail-tabs button[aria-current="page"]'));
  const expenseFilters=page.locator('.expense-filters');
  const clearFilters=page.getByRole('button',{name:'Limpiar filtros de gastos'});
  const expenseCategory=expenseFilters.getByRole('combobox',{name:'Categoría'});
  await expenseCategory.selectOption({label:'Comida'});
  const expenseDate=expenseFilters.locator('input[type=date]');
  const clearBox=await clearFilters.boundingBox(),categoryBox=await expenseCategory.boundingBox(),dateBox=await expenseDate.boundingBox();
  assert.ok(clearBox&&categoryBox&&dateBox,'All expense filters must be visible');
  assert.ok(clearBox.height>=46,'Clear button must have a proper touch target');
  if(device.width>700){
   assert.ok(Math.abs(clearBox.y+clearBox.height-(dateBox.y+dateBox.height))<=2,'Desktop clear button bottom must line up with inputs');
  }else{
   assert.ok(clearBox.y>=dateBox.y+dateBox.height+8,'Mobile clear button must have its own row');
   assert.ok(Math.abs(clearBox.x-dateBox.x)<=2&&Math.abs(clearBox.width-dateBox.width)<=2,'Mobile clear button must share input width');
  }
  await clearFilters.click();
  assert.equal(await expenseCategory.inputValue(),'Todas','Clear action must reset the category');
  assert.equal(await expenseDate.inputValue(),'','Clear action must reset the date');
  await page.screenshot({path:'artifacts/ui-delivery-a/dark-fixes/'+device.label+'-expense-filters.png'});
  const metrics=page.locator('.metrics > div').first();
  const metricPaint=await metrics.evaluate(paint);
  assert.ok(contrast(metricPaint.fg,metricPaint.bg)>=4.5);
  const card=await page.locator('.trip-detail').boundingBox();
  const stats=await metrics.boundingBox();
  assert.ok(stats.x-card.x>=14,'Metrics need a gutter inside the trip card');
  await page.getByRole('button',{name:'Agregar gasto'}).click();
  const amountField=await page.locator('.edit-panel input').first().evaluate(paint);
  assert.ok(contrast(amountField.fg,amountField.bg)>=4.5);
  assert.equal(amountField.bg,colors.darkField);
  await page.screenshot({path:'artifacts/ui-delivery-a/dark-fixes/'+device.label+'-expenses.png'});
  await page.getByRole('button',{name:'Explorar destinos'}).click();
  for(const name of ['Guías de Viaja','Viajes compartidos']){
   const choice=page.getByRole('button',{name,exact:true});
   await choice.click();
   assert.equal(await choice.getAttribute('aria-pressed'),'true');
   await selectedTab(choice);
   const selected=await choice.evaluate(paint);
   const track=await page.locator('.explore-switch').evaluate(paint);
   assert.ok(contrast(selected.bg,track.bg)>=3);
   assert.ok(contrast(selected.fg,selected.bg)>=4.5);
  }
  await selectedTab(page.locator('.topbar nav button.navactive'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1,'The tabs and expense filters must not overflow');
  assert.deepEqual(errors,[],'No runtime errors');
  await ctx.close();
  console.log('PASS '+device.label+' dark forms, icon/text spacing, date picker, planner contrast and My Trips search');
 }
}finally{await browser.close()}
