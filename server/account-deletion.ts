import {isAllowedApiOrigin} from './origin-policy.ts';
import type {ViajaAIEnv} from './ai-gateway.ts';

/**
 * Permanently deletes the currently authenticated account.
 * All privileged calls stay in Cloudflare; no secret or arbitrary user id is
 * accepted from the browser. Never invoke this against production in tests.
 *
 * Storage is removed with the Storage API BEFORE the Auth user is deleted.
 * This must remain retryable because Storage and Auth cannot share a transaction.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RECORDS=999;
const RECENT_LOGIN_MS=15*60*1000;
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

type User={id:string;email?:string;last_sign_in_at?:string;role?:string;is_anonymous?:boolean};
type TripRow={id:string};
type DocumentRow={id:string;storage_path:string;trip_id:string;uploaded_by:string;mime_type:string};
type ReservationRow={id:string;storage_path:string;owner_id:string};
type DeletionSet={documents:string[];reservations:string[]};

class UpstreamError extends Error{
 readonly code:string;
 constructor(code:string){super(code);this.code=code}
}
const apiBase=(env:ViajaAIEnv)=>env.SUPABASE_URL||'https://ovagewbmrirzrlvbvtbw.supabase.co';
const documentExt=new Map([
 ['application/pdf','pdf'],['image/jpeg','jpg'],['image/png','png'],
 ['image/webp','webp'],['text/calendar','ics']
]);
const safeConfig=(env:ViajaAIEnv)=>Boolean(env.SUPABASE_SECRET_KEY&&env.SUPABASE_PUBLISHABLE_KEY&&
 /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(apiBase(env)));

async function remote(url:string,options:RequestInit):Promise<Response>{
 try{return await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(15000)})}
 catch{throw new UpstreamError('UPSTREAM_UNAVAILABLE')}
}

async function readRecords<T>(env:ViajaAIEnv,table:string,filter:string,select:string):Promise<T[]>{
 const path='/rest/v1/'+table+'?select='+encodeURIComponent(select)+'&'+filter+'&limit='+String(MAX_RECORDS+1);
 const response=await remote(apiBase(env)+path,{headers:{apikey:env.SUPABASE_SECRET_KEY!}});
 if(!response.ok)throw new UpstreamError('DATA_READ_FAILED');
 const rows=await response.json().catch(()=>null) as unknown;
 if(!Array.isArray(rows)||rows.length>MAX_RECORDS)throw new UpstreamError('TOO_MANY_RECORDS');
 return rows as T[];
}

async function buildDeletionSet(env:ViajaAIEnv,userId:string):Promise<DeletionSet>{
 const [owned,uploaded,reservations]=await Promise.all([
  readRecords<TripRow>(env,'trips','user_id=eq.'+userId,'id'),
  readRecords<DocumentRow>(env,'trip_documents','uploaded_by=eq.'+userId,'id,storage_path,trip_id,uploaded_by,mime_type'),
  readRecords<ReservationRow>(env,'reservation_files','owner_id=eq.'+userId,'id,storage_path,owner_id')
 ]);
 const trips=owned.map(x=>x.id);
 if(trips.some(id=>!UUID.test(id)))throw new UpstreamError('INVALID_RECORD');
 const documents=[...uploaded];
 // An owned trip may contain documents uploaded by collaborators. Its deletion
 // must also remove those bytes, while never deleting other shared trips.
 for(let start=0;start<trips.length;start+=20){
  const chunk=trips.slice(start,start+20);
  const rows=await readRecords<DocumentRow>(env,'trip_documents',
   'trip_id=in.('+chunk.join(',')+')','id,storage_path,trip_id,uploaded_by,mime_type');
  documents.push(...rows);
 }
 const ownedSet=new Set(trips),documentPaths=new Set<string>();
 for(const doc of documents){
  const byUser=doc.uploaded_by===userId;
  const ext=documentExt.get(doc.mime_type);
  if(!UUID.test(doc.id)||!UUID.test(doc.trip_id)||!UUID.test(doc.uploaded_by)||(!byUser&&!ownedSet.has(doc.trip_id))||
   !ext||doc.storage_path!==doc.trip_id+'/'+doc.id+'/document.'+ext)
   throw new UpstreamError('INVALID_RECORD');
  documentPaths.add(doc.storage_path);
 }
 const reservationPaths=new Set<string>();
 for(const row of reservations){
  if(!UUID.test(row.id)||row.owner_id!==userId||
   row.storage_path!==userId+'/'+row.id+'/source.pdf')throw new UpstreamError('INVALID_RECORD');
  reservationPaths.add(row.storage_path);
 }
 if(documentPaths.size+reservationPaths.size>MAX_RECORDS)throw new UpstreamError('TOO_MANY_RECORDS');
 return {documents:[...documentPaths],reservations:[...reservationPaths]};
}

async function removeStorage(env:ViajaAIEnv,bucket:string,paths:string[]):Promise<void>{
 for(let start=0;start<paths.length;start+=100){
  const batch=paths.slice(start,start+100);
  const result=await remote(apiBase(env)+'/storage/v1/object/'+bucket,{
   method:'DELETE',headers:{apikey:env.SUPABASE_SECRET_KEY!,'Content-Type':'application/json'},
   body:JSON.stringify({prefixes:batch})
  });
  if(!result.ok)throw new UpstreamError('STORAGE_DELETE_FAILED');
 }
}

async function removeOwnDocumentRecords(env:ViajaAIEnv,userId:string){
 const result=await remote(apiBase(env)+'/rest/v1/trip_documents?uploaded_by=eq.'+userId,{
  method:'DELETE',headers:{apikey:env.SUPABASE_SECRET_KEY!,'Prefer':'return=minimal'}
 });
 if(!result.ok)throw new UpstreamError('DATA_DELETE_FAILED');
}

async function deleteAuthUser(env:ViajaAIEnv,userId:string){
 const result=await remote(apiBase(env)+'/auth/v1/admin/users/'+userId,{
  method:'DELETE',headers:{apikey:env.SUPABASE_SECRET_KEY!}
 });
 if(!result.ok)throw new UpstreamError('AUTH_DELETE_FAILED');
}

export async function accountDeletionAPI(request:Request,env:ViajaAIEnv):Promise<Response>{
 if(request.method!=='POST')return reply({error:'Método no permitido.'},405);
 // Disabled in production until isolated Storage/Auth QA and recovery are signed off.
 // Unlike a client-only flag, this blocks every destructive server operation.
 if(env.VIAJA_ACCOUNT_DELETION_ENABLED!=='true')
  return reply({code:'ACCOUNT_DELETION_DISABLED',error:'La eliminación automática de cuentas está temporalmente deshabilitada.'},503);
 if(!isAllowedApiOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!safeConfig(env))return reply({error:'La eliminación de cuentas no está configurada.'},503);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
  return reply({error:'Formato inválido.'},415);
 const bearer=request.headers.get('authorization')||'';
 if(!/^Bearer [a-zA-Z0-9._-]+$/.test(bearer))return reply({error:'Iniciá sesión para continuar.'},401);
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isFinite(length)||length>512)return reply({error:'Solicitud demasiado extensa.'},413);
 let payload:unknown;
 try{
  const raw=await request.text();
  if(raw.length>512)throw Error();
  payload=JSON.parse(raw);
 }catch{return reply({error:'Solicitud inválida.'},400)}
 const confirmation=payload as {confirmation?:unknown;email?:unknown};
 if(confirmation?.confirmation!=='ELIMINAR MI CUENTA'||typeof confirmation.email!=='string')
  return reply({error:'Confirmación explícita requerida.'},400);

 let user:User;
 try{
  const check=await remote(apiBase(env)+'/auth/v1/user',{
   headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY!,Authorization:bearer}
  });
  if(!check.ok)return reply({error:'La sesión no es válida. Volvé a iniciar sesión.'},401);
  user=await check.json() as User;
 }catch{return reply({error:'No pudimos verificar tu sesión.'},503)}
 if(!UUID.test(user.id)||user.role==='anon'||user.is_anonymous||!user.email||
  confirmation.email.trim().toLowerCase()!==user.email.trim().toLowerCase())
  return reply({error:'La cuenta no coincide con la sesión actual.'},403);
 const lastLogin=Date.parse(user.last_sign_in_at||'');
 if(!Number.isFinite(lastLogin)||lastLogin>Date.now()+60000||Date.now()-lastLogin>RECENT_LOGIN_MS)
  return reply({code:'REAUTH_REQUIRED',error:'Por seguridad, cerrá sesión y volvé a entrar antes de eliminar tu cuenta.'},409);

 try{
  const selected=await buildDeletionSet(env,user.id);
  await removeStorage(env,'trip-documents',selected.documents);
  await removeStorage(env,'reservation-pdfs',selected.reservations);
  await removeOwnDocumentRecords(env,user.id);
  await deleteAuthUser(env,user.id);
  return reply({deleted:true});
 }catch(e){
  const code=e instanceof UpstreamError?e.code:'ACCOUNT_DELETION_FAILED';
  // No private paths, emails, JWTs or service credentials in logs or errors.
  console.warn('[Viaja account deletion]',code);
  return reply({code,error:code==='TOO_MANY_RECORDS'
   ?'La cuenta requiere una eliminación asistida. Contactá con soporte antes de volver a intentarlo.'
   :'No pudimos completar la eliminación. Algunas operaciones pueden haberse realizado; reintentá o solicitá ayuda a soporte.'},503);
 }
}
