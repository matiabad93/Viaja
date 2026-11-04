import {isAllowedApiOrigin} from './origin-policy.ts';
/**
 * Viaja P1.2 — the only file upload entrypoint.
 * Storage INSERT is denied to browser JWTs by RLS. Only this backend uses
 * SUPABASE_SECRET_KEY after independently validating the JWT, ownership,
 * trip-editor permission, actual bytes, file magic and declared metadata.
 */
import type {ViajaAIEnv} from './ai-gateway';

const MAX_FILE_BYTES=10485760;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME_TO_EXT:Record<string,string>={
 'application/pdf':'pdf','image/jpeg':'jpg',
 'image/png':'png','image/webp':'webp','text/calendar':'ics'
};
type Registry={
 id:string;storage_path:string;size_bytes:number;mime_type:string;
 owner_id?:string;uploaded_by?:string;trip_id?:string;
};
const json=(data:unknown,status=200)=>Response.json(data,{
 status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
const configured=(env:ViajaAIEnv)=>Boolean(
 env.SUPABASE_SECRET_KEY&&env.SUPABASE_PUBLISHABLE_KEY&&
 (!env.SUPABASE_URL||/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL))
);
function safeOrigin(request:Request){
 return isAllowedApiOrigin(request);
}
function verifyMagic(bytes:Uint8Array,mime:string){
 const ascii=(start:number,end:number)=>new TextDecoder().decode(bytes.slice(start,end));
 const equal=(values:number[],offset=0)=>values.every((b,i)=>bytes[i+offset]===b);
 switch(mime){
  case 'application/pdf':return ascii(0,5)==='%PDF-';
  case 'image/jpeg':return equal([255,216,255]);
  case 'image/png':return equal([137,80,78,71,13,10,26,10]);
  case 'image/webp':return ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
  case 'text/calendar':return ascii(0,512).replace(/^\uFEFF/,'').trimStart().startsWith('BEGIN:VCALENDAR');
  default:return false;
 }
}
async function readBoundedBody(request:Request):Promise<Uint8Array>{
 const stream=request.body;
 if(!stream)throw Error('EMPTY_FILE');
 const reader=stream.getReader();
 const chunks:Uint8Array[]=[];
 let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>MAX_FILE_BYTES)throw Error('DOCUMENT_FILE_LIMIT_10MB');
   chunks.push(value);
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e}
 finally{reader.releaseLock()}
 if(size===0)throw Error('EMPTY_FILE');
 const result=new Uint8Array(size);
 let offset=0;
 for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}
 return result;
}
export async function privateDocumentUploadAPI(request:Request,env:ViajaAIEnv):Promise<Response>{
 if(request.method!=='POST')return json({error:'Método no permitido.'},405);
 if(!safeOrigin(request))return json({error:'Origen no permitido.'},403);
 if(!configured(env))return json({error:'La subida privada no está configurada en el servidor.'},503);
 const u=new URL(request.url);
 const kind=u.searchParams.get('kind');
 const documentId=u.searchParams.get('id');
 if(!ID.test(documentId||'')||(kind!=='reservation'&&kind!=='trip'))
  return json({error:'Referencia de documento inválida.'},400);
 const token=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(token))
  return json({error:'Iniciá sesión antes de subir documentos.'},401);
 const inputMime=(request.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase();
 if(!MIME_TO_EXT[inputMime])
  return json({error:'Formato de archivo no permitido.'},415);
 if(kind==='reservation'&&inputMime!=='application/pdf')
  return json({error:'Solo se permiten PDFs en Reservas.'},415);
 const claimed=Number(request.headers.get('content-length')||0);
 if(!Number.isFinite(claimed)||claimed>MAX_FILE_BYTES)
  return json({error:'El archivo supera el máximo permitido de 10 MB.'},413);

 const base=env.SUPABASE_URL||'https://ovagewbmrirzrlvbvtbw.supabase.co';
 const publish=env.SUPABASE_PUBLISHABLE_KEY!;
 const jwtHeaders={apikey:publish,Authorization:token};
 let userId:string;
 try{
  const identity=await fetch(base+'/auth/v1/user',{
   method:'GET',headers:jwtHeaders,cache:'no-store',signal:AbortSignal.timeout(8000)
  });
  if(!identity.ok)return json({error:'La sesión es inválida o venció.'},401);
  const user=await identity.json() as {id?:string;role?:string;is_anonymous?:boolean};
  if(!user.id||!ID.test(user.id)||user.role==='anon'||user.is_anonymous)
   return json({error:'Autenticación requerida.'},401);
  userId=user.id;
 }catch{return json({error:'No pudimos verificar tu sesión.'},503)}

 const table=kind==='reservation'?'reservation_files':'trip_documents';
 let record:Registry|undefined;
 try{
  const response=await fetch(
   base+'/rest/v1/'+table+'?select=id,storage_path,size_bytes,mime_type,'+
   (kind==='reservation'?'owner_id':'uploaded_by,trip_id')+
   '&id=eq.'+encodeURIComponent(documentId!)+'&limit=1',{
    headers:jwtHeaders,cache:'no-store',signal:AbortSignal.timeout(10000)
   });
  if(!response.ok)return json({error:'No se pudo comprobar la autorización del documento.'},403);
  const rows=await response.json() as Registry[];
  record=rows?.[0];
 }catch{return json({error:'No se pudo leer el registro de documentos.'},503)}
 if(!record||record.id!==documentId)return json({error:'Documento inexistente o sin permisos.'},404);
 if((kind==='reservation'?record.owner_id:record.uploaded_by)!==userId)
  return json({error:'Documento inexistente o sin permisos.'},404);
 if(!Number.isInteger(record.size_bytes)||record.size_bytes<1||record.size_bytes>MAX_FILE_BYTES)
  return json({error:'Tamaño registrado inválido.'},422);
 if(record.mime_type!==inputMime)return json({error:'El tipo no coincide con el documento registrado.'},415);
 const expectedPath=kind==='reservation'
  ?userId+'/'+documentId+'/source.pdf'
  :record.trip_id+'/'+documentId+'/document.'+MIME_TO_EXT[record.mime_type];
 if(record.storage_path!==expectedPath||!ID.test(record.trip_id||userId))
  return json({error:'Referencia de archivo inválida.'},422);

 if(kind==='trip'){
  // Membership can be revoked after metadata creation. Check current role.
  try{
   const r=await fetch(base+'/rest/v1/rpc/viaja_can_upload_trip_document',{
    method:'POST',headers:{...jwtHeaders,'Content-Type':'application/json'},
    body:JSON.stringify({p_document_id:documentId}),
    cache:'no-store',signal:AbortSignal.timeout(9000)
   });
   if(!r.ok||await r.json()!==true)
    return json({error:'Solo el organizador o un editor puede adjuntar archivos.'},403);
  }catch{return json({error:'No pudimos comprobar los permisos de edición.'},503)}
 }
 let bytes:Uint8Array;
 try{bytes=await readBoundedBody(request)}
 catch(e){
  return json({error:(e as Error).message==='DOCUMENT_FILE_LIMIT_10MB'
   ?'El archivo supera el máximo de 10 MB.':'No pudimos leer el archivo.'},413);
 }
 if(bytes.byteLength!==record.size_bytes)return json({error:'El tamaño real no coincide con el registrado.'},422);
 if(!verifyMagic(bytes,record.mime_type))return json({error:'El archivo no coincide con el formato declarado.'},415);

 // Never send the user's JWT or an untrusted path as a privileged bearer.
 // Supabase secret keys are opaque and belong ONLY in the apikey header.
 const bucket=kind==='reservation'?'reservation-pdfs':'trip-documents';
 const path=record.storage_path.split('/').map(encodeURIComponent).join('/');
 try{
  const uploaded=await fetch(base+'/storage/v1/object/'+bucket+'/'+path,{
   method:'POST',
   headers:{apikey:env.SUPABASE_SECRET_KEY!,'Content-Type':record.mime_type,
    'x-upsert':'false','cache-control':'3600'},
   body:bytes.buffer as ArrayBuffer,
   cache:'no-store',signal:AbortSignal.timeout(40000)
  });
  if(uploaded.status===409)return json({error:'El archivo ya existe. No se sobrescribió.'},409);
  if(!uploaded.ok){
   console.warn('[Viaja private upload]',JSON.stringify({code:'STORAGE_ERROR',status:uploaded.status}));
   return json({error:'No se pudo guardar el archivo privado. Probá nuevamente.'},502);
  }
 }catch{return json({error:'El almacenamiento no respondió. Probá nuevamente.'},502)}
 return json({uploaded:true,id:record.id},201);
}
