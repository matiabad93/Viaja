import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from '/tmp/viaja-ui-smoke/node_modules/playwright/index.mjs';

const origin=process.env.VIAJA_LOCAL_URL||'http://127.0.0.1:4173';
const webkitMode=process.env.VIAJA_BROWSER==='webkit';
const browser=await (webkitMode?webkit:chromium).launch({
 headless:true,...(!webkitMode?{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}:{})
});
const mobileSets=[
 {name:'iphone320',width:320,height:720},
 {name:'iphone390',width:390,height:844},
 {name:'desktop1280',width:1280,height:900}
];
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const viewer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tripId='11111111-1111-4111-8111-111111111111';
const plan={
 id:tripId,kind:'draft',createdAt:'2026-11-04T00:00:00Z',
 trip:{destination:'Colmar',additionalDestinations:[],origin:'Barcelona',start:'2026-11-27',end:'2026-11-30',travelers:2,budget:200,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:[]},
 itinerary:[{id:'d1',title:'Colmar',activities:[{id:'a1',title:'Mercado',description:'Paseo'}]}],
 logistics:{accommodations:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',name:'Hotel Colmar',kind:'hotel',address:'Rue de Paris',checkIn:'2026-11-27',checkOut:'2026-11-30',status:'confirmed'}],transports:[]},expenses:[]
};
const padPdf=Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
const emptyPdf=Buffer.from('not a pdf');
await mkdir('artifacts/documents-c',{recursive:true});
const mockSupabase=async(context,userId,seed=[])=>{
 let docs=[...seed],files=new Map(),uploads=0,deletes=0,signs=0;
 await context.addInitScript(({userId})=>{
  localStorage.setItem('viaja-theme','dark');
  localStorage.setItem('viaja-auth-session-v1',JSON.stringify({
   access_token:[
    btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),
    btoa(JSON.stringify({sub:userId,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+36000})),
    'mock-signature'
   ].join('.'),refresh_token:'test-refresh',
   expires_at:Math.floor(Date.now()/1000)+36000,
   user:{id:userId,email:'test@example.invalid'}
  }));
 },{userId});
 await context.route('https://ovagewbmrirzrlvbvtbw.supabase.co/**',async route=>{
  const request=route.request(),u=new URL(request.url()),p=u.pathname,method=request.method();
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(p==='/auth/v1/user')return json({id:userId,email:'test@example.invalid'});
  if(p==='/rest/v1/trips')return json([{user_id:owner,version:3,document:plan}]);
  if(p==='/rest/v1/trip_members')return json(userId===viewer?[{trip_id:tripId,user_id:viewer,role:'viewer'}]:[]);
  if(p.startsWith('/rest/v1/community_trips'))return json([]);
  if(p==='/rest/v1/trip_documents'){
   if(method==='GET')return json(docs);
   if(method==='POST'){
    const incoming=JSON.parse(request.postData()||'{}');
    if(userId===viewer)return json({message:'RLS prevents viewer uploads'},403);
    const row={...incoming,created_at:'2026-11-04T01:00:00Z'};
    docs=[row,...docs];
    return json([row],201);
   }
   if(method==='DELETE'){
    if(userId===viewer)return json({message:'RLS prevents viewer deletes'},403);
    const id=u.searchParams.get('id')?.replace(/^eq\./,'');
    const deleted=docs.filter(d=>d.id===id);
    docs=docs.filter(d=>d.id!==id);
    deletes+=deleted.length;
    return json(deleted);
   }
  }
  if(p==='/storage/v1/object/trip-documents'&&method==='DELETE'){
   if(userId===viewer)return json({message:'Forbidden'},403);
   const value=JSON.parse(request.postData()||'{}');
   for(const name of value.prefixes||[])files.delete(name);
   return json([]);
  }
  if(p.startsWith('/storage/v1/object/trip-documents/')&&method==='POST'){
   if(userId===viewer)return json({message:'Forbidden'},403);
   const name=decodeURIComponent(p.slice('/storage/v1/object/trip-documents/'.length));
   assert.match(name,/^11111111.*\/document.pdf$/);
   files.set(name,request.postDataBuffer());
   uploads++;
   return json({id:'uploaded',path:name,fullPath:'trip-documents/'+name});
  }
  if(p.startsWith('/storage/v1/object/sign/trip-documents/')&&method==='POST'){
   signs++;
   const name=p.slice('/storage/v1/object/sign/trip-documents/'.length);
   return json({signedURL:'/object/sign/trip-documents/'+name+'?token=mock-2min'});
  }
  if(p.startsWith('/storage/v1/object/sign/trip-documents/')&&method==='GET'){
   return route.fulfill({status:200,contentType:'application/pdf',body:padPdf});
  }
  return json([]);
 });
 return {get documents(){return docs},get uploads(){return uploads},get deletes(){return deletes},get signs(){return signs},get files(){return files}};
};
const noOverflow=async page=>{
 const widths=await page.evaluate(()=>({screen:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
 assert.ok(widths.content<=widths.screen+1,'Horizontal scroll in documents view: '+JSON.stringify(widths));
};
try{
 for(const device of mobileSets){
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:device.width,height:device.height},colorScheme:'dark',locale:'es-ES',acceptDownloads:true});
  const backend=await mockSupabase(ctx,owner);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('button',{name:'Ver viaje →'}).click();
  await page.getByRole('navigation',{name:'Secciones del viaje'}).getByRole('button',{name:'Logística'}).click();
  await page.getByRole('heading',{name:'Documentos y comprobantes'}).waitFor();
  try {
   await page.getByText('No hay comprobantes todavía.').waitFor({timeout:15000});
  }catch(error){
   const snapshot=await page.evaluate(()=>({
    text:document.body.innerText.slice(0,2200),
    auth:Boolean(localStorage.getItem('viaja-auth-session-v1')),
    location:location.href
   }));
   throw new Error('Document empty-state not visible; Safari session diagnostic: '+JSON.stringify(snapshot),{cause:error});
  }
  await noOverflow(page);
  // Client-side file signature validation must reject disguised HTML.
  const fileInput=page.locator('.document-file-input');
  await fileInput.setInputFiles({name:'fake.pdf',mimeType:'application/pdf',buffer:emptyPdf});
  await page.getByText(/El contenido no coincide con el formato PDF/).waitFor();
  assert.equal(backend.uploads,0,'Rejected HTML must not reach Storage');
  // User explicitly selects and confirms a valid PDF for a specific lodging.
  await fileInput.setInputFiles({name:'Billete Colmar.pdf',mimeType:'application/pdf',buffer:padPdf});
  await page.getByRole('region',{name:'Archivo seleccionado'}).waitFor();
  await page.getByLabel('Vincular comprobante').selectOption('accommodation:cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  await page.getByRole('button',{name:'Guardar archivo privado'}).click();
  await page.locator('.document-row').getByText('Billete Colmar.pdf').waitFor();
  assert.equal(backend.documents.length,1,'Document registry should be updated');
  assert.equal(backend.documents[0].related_type,'accommodation');
  assert.equal(backend.uploads,1,'Storage POST should happen after the metadata insert');
  assert.match(backend.documents[0].storage_path,/\/document.pdf$/);
  assert.equal((await page.locator('.logistics-summary > div').nth(2).locator('strong').textContent())?.trim(),'1');
  await noOverflow(page);
  await page.locator('.document-row').getByRole('button',{name:'Ver'}).click();
  await page.getByRole('dialog',{name:/Vista previa de Billete Colmar.pdf/}).waitFor();
  await page.getByRole('link',{name:'Descargar archivo'}).waitFor();
  assert.ok(backend.signs>=2,'Short-lived Storage signing must be used');
  await page.getByRole('button',{name:'Cerrar vista previa'}).click();
  await page.screenshot({path:'artifacts/documents-c/'+device.name+'-'+(webkitMode?'webkit':'chromium')+'.png',fullPage:true});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Mis viajes/}).click();
  await page.getByRole('button',{name:'Ver viaje →'}).click();
  await page.getByRole('navigation',{name:'Secciones del viaje'}).getByRole('button',{name:'Logística'}).click();
  await page.locator('.document-row').getByText('Billete Colmar.pdf').waitFor();
  await page.getByRole('button',{name:'Eliminar documento Billete Colmar.pdf'}).click();
  await page.getByRole('button',{name:'Eliminar archivo'}).click();
  await page.getByText('No hay comprobantes todavía.').waitFor();
  assert.equal(backend.documents.length,0);
  assert.equal(backend.deletes,1,'Document metadata and private file were removed');
  assert.deepEqual(errors,[],'Unexpected browser errors in '+device.name);
  console.log('PASS '+device.name+' '+(webkitMode?'WebKit':'Chromium')+' document uploads, private previews, delete, persistence, dark UI');
  await ctx.close();
 }
 // Reader can list and preview, but cannot add or delete.
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},colorScheme:'dark',locale:'es-ES'});
 const seed={
  id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',trip_id:tripId,uploaded_by:owner,
  storage_path:tripId+'/dddddddd-dddd-4ddd-8ddd-dddddddddddd/document.pdf',
  filename:'Billete privado.pdf',mime_type:'application/pdf',size_bytes:124,
  related_type:'trip',related_id:null,created_at:'2026-11-04T01:00:00Z'
 };
 const backend=await mockSupabase(ctx,viewer,[seed]);
 const page=await ctx.newPage();
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Mis viajes/}).click();
 await page.getByRole('button',{name:'Ver viaje →'}).click();
 await page.getByRole('navigation',{name:'Secciones del viaje'}).getByRole('button',{name:'Logística'}).click();
 await page.getByText('Billete privado.pdf').waitFor();
 assert.equal(await page.getByRole('button',{name:'Elegir archivo'}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Eliminar documento Billete privado.pdf'}).count(),0);
 await page.locator('.document-row').getByRole('button',{name:'Ver'}).click();
 await page.getByRole('link',{name:'Descargar archivo'}).waitFor();
 assert.ok(backend.signs>=2);
 await noOverflow(page);
 console.log('PASS viewer role: can access permitted private documents, cannot upload/delete');
 await ctx.close();
}finally{await browser.close()}
