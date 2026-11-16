import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const date=(offset)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fixture=(id,destination,start,end,created,stops=[])=>({
 id,createdAt:created,kind:'draft',trip:{destination,additionalDestinations:stops,origin:'Barcelona, España',start,end,travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official']},
 itinerary:[],expenses:[]
});
const fixtures=[
 fixture('past','Edimburgo, Escocia',date(-14),date(-12),'2026-10-01T10:00:00Z'),
 fixture('far','París, Francia',date(20),date(22),'2026-11-01T10:00:00Z',['Brujas, Bélgica']),
 fixture('undated','Málaga, España','','','2026-11-15T10:00:00Z'),
 fixture('soon','Roma, Italia',date(4),date(6),'2026-11-13T10:00:00Z'),
 fixture('now','Colmar, Francia',date(-1),date(1),'2026-11-14T10:00:00Z')
];

await mkdir('artifacts/trip-list-ux',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.VIAJA_BROWSER_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [{name:'iphone-small',width:320,height:730,theme:'light'},{name:'iphone-dark',width:390,height:844,theme:'dark'},{name:'desktop',width:1280,height:900,theme:'light'}]){
  const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},colorScheme:device.theme,locale:'es-ES'});
  await ctx.addInitScript(items=>{localStorage.setItem('viaja-ai-trips-v1',JSON.stringify(items));if(window.matchMedia('(prefers-color-scheme: dark)').matches)localStorage.setItem('viaja-theme','dark')},fixtures);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('heading',{name:'Mis viajes',exact:true}).waitFor();
  assert.equal(await page.locator('.journey-card').count(),5);
  assert.match(await page.locator('.journey-card h2').first().innerText(),/Colmar/,'Ongoing trip appears first');
  assert.match(await page.locator('.filterpills').innerText(),/Próximo\s+2/,'Status filter shows accurate count');
  await page.screenshot({path:`artifacts/trip-list-ux/${device.name}-all.png`,fullPage:true});
  await page.getByRole('group',{name:'Filtrar viajes por estado'}).getByRole('button',{name:/Próximo/}).click();
  assert.equal(await page.locator('.journey-card').count(),2);
  await page.getByRole('textbox',{name:'Buscar mis viajes'}).fill('BRUJAS');
  assert.equal(await page.locator('.journey-card').count(),1,'Additional destination must be searchable');
  assert.match(await page.locator('.journey-card h2').first().innerText(),/París/);
  await page.getByRole('textbox',{name:'Buscar mis viajes'}).fill('No existe');
  await page.getByRole('heading',{name:'No hay viajes con esos filtros'}).waitFor();
  await page.getByRole('button',{name:'Mostrar todos mis viajes'}).click();
  assert.equal(await page.locator('.journey-card').count(),5,'Clear filters reveals all saved trips');
  await page.getByRole('combobox',{name:'Ordenar viajes'}).selectOption('Más recientes');
  assert.match(await page.locator('.journey-card h2').first().innerText(),/Málaga/,'Recent ordering changes the list');
  assert.ok(await page.getByText('Fechas por definir').first().isVisible());
  await page.screenshot({path:`artifacts/trip-list-ux/${device.name}-sorted.png`,fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=2,'Trip list overflows '+device.name+' by '+overflow+'px');
  assert.deepEqual(errors,[]);
  console.log('PASS '+device.name+' trip sorting, search across stops, clear filters, dark mode and responsive layout');
  await ctx.close();
 }
}finally{await browser.close()}
