import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const base=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
const safari=process.env.VIAJA_BROWSER==='webkit';
const engine=safari?webkit:chromium;
const browser=await engine.launch({headless:true,...(safari?{}:{
 executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']
})});
await mkdir('artifacts/reservations-c',{recursive:true});
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',tripId='11111111-1111-4111-8111-111111111111';
const plan={
 id:tripId,kind:'draft',createdAt:'2026-11-04T00:00:00Z',
 trip:{destination:'Colmar',additionalDestinations:[],origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:300,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:[]},
 itinerary:[{id:'d1',title:'Día 1',activities:[{id:'a1',title:'Mercado',description:'Caminar'}]}],
 logistics:{accommodations:[],transports:[]},expenses:[]
};
const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const setup=async(ctx)=>{
 let docs=[],storage=new Map(),extractCalls=0,uploaded=0,deleted=0,signed=0;
 await ctx.addInitScript(()=>{
  const toB64=s=>btoa(JSON.stringify(s)).replace(/=/g,'');
  const token=[toB64({alg:'HS256',typ:'JWT'}),toB64({
   sub:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'authenticated',
   exp:Math.floor(Date.now()/1000)+36000
  }),'mock'].join('.');
  localStorage.setItem('viaja-theme','dark');
  localStorage.setItem('viaja-auth-session-v1',JSON.stringify({
   access_token:token,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+36000,
   user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'test@example.invalid'}
  }));
 });
 await ctx.route('**/api/reservations/extract',async route=>{
  extractCalls++;
  const body=JSON.parse(route.request().postData()||'{}');
  assert.equal(body.consent,true);
  assert.ok(body.reservationId);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   kind:'flight',title:'Vuelo Barcelona — Basilea',
   details:{provider:'Vueling',bookingReference:'AB123',
    flights:[{company:'Vueling',serviceNumber:'VY101',origin:'Barcelona',destination:'Basilea',
      departureAt:'2026-11-27T16:30',arrivalAt:'2026-11-27T18:20',departureTimezone:'Europe/Madrid',arrivalTimezone:'Europe/Paris'}],
    lodging:null,warnings:['Revisá la hora de llegada']},
   requiresConfirmation:true
  })});
 });
 await ctx.route('https://ovagewbmrirzrlvbvtbw.supabase.co/**',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname,method=req.method();
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(p==='/auth/v1/user')return json({id:owner,email:'test@example.invalid'});
  if(p==='/rest/v1/trips')return json([{user_id:owner,version:2,document:plan}]);
  if(p==='/rest/v1/trip_members')return json([]);
  if(p.startsWith('/rest/v1/community_trips'))return json([]);
  if(p==='/rest/v1/reservation_files'){
   if(method==='GET')return json(docs);
   if(method==='POST'){
    const body=JSON.parse(req.postData()||'{}');
    assert.equal(body.linked_trip_id,null,'Upload must not force a trip association');
    const record={...body,created_at:'2026-11-04T01:00:00Z',updated_at:'2026-11-04T01:00:00Z',reviewed_at:null};
    docs=[record,...docs];return json([record],201);
   }
   if(method==='PATCH'){
    const id=u.searchParams.get('id')?.replace(/^eq\./,'');
    const changes=JSON.parse(req.postData()||'{}');
    docs=docs.map(d=>d.id===id?{...d,...changes}:d);
    return json(docs.filter(d=>d.id===id));
   }
   if(method==='DELETE'){
    const id=u.searchParams.get('id')?.replace(/^eq\./,'');
    const rows=docs.filter(d=>d.id===id);docs=docs.filter(d=>d.id!==id);
    deleted++;return json(rows);
   }
  }
  if(p==='/storage/v1/object/reservation-pdfs'&&method==='DELETE'){
   const val=JSON.parse(req.postData()||'{}');
   for(const path of val.prefixes||[])storage.delete(path);
   return json([]);
  }
  if(p.startsWith('/storage/v1/object/reservation-pdfs/')&&method==='POST'){
   const path=p.slice('/storage/v1/object/reservation-pdfs/'.length);
   assert.match(path,/^aaaaaaaa-aaaa.*\/source.pdf$/);
   uploaded++;storage.set(path,req.postDataBuffer());
   return json({path,id:'stored'});
  }
  if(p.startsWith('/storage/v1/object/sign/reservation-pdfs/')&&method==='POST'){
   signed++;
   const path=p.slice('/storage/v1/object/sign/reservation-pdfs/'.length);
   return json({signedURL:'/object/sign/reservation-pdfs/'+path+'?token=test-signed'});
  }
  if(p.startsWith('/storage/v1/object/sign/reservation-pdfs/')&&method==='GET')
   return route.fulfill({status:200,contentType:'application/pdf',body:pdf});
  return json([]);
 });
 return {get docs(){return docs},get uploaded(){return uploaded},get deleted(){return deleted},get signed(){return signed},get extractCalls(){return extractCalls}};
};
const widths=[{name:'iPhone320',width:320,height:720},{name:'iPhone390',width:390,height:844},{name:'desktop',width:1280,height:900}];
try{
 for(const dim of widths){
  const ctx=await browser.newContext({viewport:{width:dim.width,height:dim.height},colorScheme:'dark',locale:'es-ES',acceptDownloads:true,serviceWorkers:'block'});
  const backend=await setup(ctx);
  const page=await ctx.newPage(),pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const nav=page.getByRole('navigation',{name:'Navegación principal'});
  assert.equal(await nav.getByRole('button',{name:'Reservas'}).count(),1);
  await nav.getByRole('button',{name:'Reservas'}).click();
  await page.getByRole('heading',{name:'Tus reservas, siempre a mano.'}).waitFor();
  assert.ok(await page.getByText('Solo PDF. Máximo 10 MB por archivo.',{exact:false}).isVisible());
  const fileInput=page.getByLabel('Seleccionar PDFs');
  // Strict PDF-only validation even when a non-PDF advertises a spoofed MIME.
  await fileInput.setInputFiles({name:'codigo-qr.png',mimeType:'application/pdf',buffer:pdf});
  await page.getByRole('alert').getByText(/Solo se permiten archivos PDF/).waitFor();
  await fileInput.setInputFiles({name:'falso.pdf',mimeType:'application/pdf',buffer:Buffer.from('HTML')});
  await page.getByRole('alert').getByText(/no es un PDF válido/).waitFor();
  assert.equal(backend.uploaded,0);
  // Save a private PDF WITHOUT linking to any trip.
  await fileInput.setInputFiles({name:'billete-basel.pdf',mimeType:'application/pdf',buffer:pdf});
  await page.getByRole('button',{name:'Guardar PDFs privados'}).click();
  await page.getByRole('form',{name:'Revisar reserva billete-basel.pdf'}).waitFor();
  assert.equal(backend.uploaded,1);
  assert.equal(backend.docs[0].linked_trip_id,null);
  await page.getByRole('form',{name:'Revisar reserva billete-basel.pdf'}).getByRole('button',{name:'Cancelar'}).click();
  await page.getByRole('heading',{name:'billete-basel'}).waitFor();
  await page.getByRole('button',{name:'Ver PDF / QR'}).click();
  await page.getByRole('dialog',{name:'Billete PDF billete-basel.pdf'}).waitFor();
  await page.getByRole('link',{name:'Descargar'}).waitFor();
  assert.ok(backend.signed>=2);
  await page.getByRole('button',{name:'Cerrar PDF'}).click();
  // Consent is mandatory. Cancelling never contacts AI.
  await page.getByRole('button',{name:'Extraer con IA'}).click();
  await page.getByRole('dialog',{name:'¿Analizar este PDF con Gemini?'}).getByRole('button',{name:'Cancelar'}).click();
  assert.equal(backend.extractCalls,0);
  await page.getByRole('button',{name:'Extraer con IA'}).click();
  await page.getByRole('dialog',{name:'¿Analizar este PDF con Gemini?'}).getByRole('button',{name:'Acepto, analizar PDF'}).click();
  const form=page.getByRole('form',{name:'Revisar reserva billete-basel.pdf'});
  await form.waitFor();
  await form.getByRole('heading',{name:'Revisá los datos sugeridos'}).waitFor();
  assert.equal(backend.extractCalls,1);
  assert.equal(backend.docs[0].reviewed_at,null,'AI must not auto-save proposed data');
  // Human confirmation links the document to an editable trip.
  await form.getByLabel('Vincular con un viaje (opcional)').selectOption(tripId);
  await form.getByRole('button',{name:'Confirmar y guardar datos'}).click();
  await page.getByRole('heading',{name:'Vuelo Barcelona — Basilea'}).waitFor();
  assert.equal(backend.docs[0].linked_trip_id,tripId);
  assert.equal(backend.docs[0].kind,'flight');
  assert.ok(backend.docs[0].reviewed_at);
  await page.getByRole('button',{name:'Vuelos',exact:true}).click();
  assert.equal(await page.locator('.reservation-card').count(),1);
  await page.screenshot({path:'artifacts/reservations-c/'+dim.name+'-'+(safari?'webkit':'chromium')+'.png',fullPage:true});
  const width=await page.evaluate(()=>({client:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  assert.ok(width.content<=width.client+1,'Horizontal overflow '+JSON.stringify(width));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:'Reservas'}).click();
  await page.getByRole('heading',{name:'Vuelo Barcelona — Basilea'}).waitFor();
  await page.getByRole('button',{name:'Eliminar reserva billete-basel.pdf'}).click();
  await page.getByRole('alertdialog',{name:'¿Eliminar esta reserva PDF?'}).getByRole('button',{name:'Eliminar PDF'}).click();
  await page.getByRole('heading',{name:'Todavía no guardaste reservas.'}).waitFor();
  assert.equal(backend.docs.length,0);
  assert.equal(backend.deleted,1);
  assert.deepEqual(pageErrors,[]);
  await ctx.close();
  console.log('PASS '+dim.name+' '+(safari?'WebKit':'Chromium')+': PDF-only upload, QR viewer, consent, review, linking, persistence, deletion and mobile layout');
 }
}finally{await browser.close()}
