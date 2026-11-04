/**
 * Browser-side Supabase Auth / PostgREST adapter for Viaja.
 * Only a publishable key is used here; never use a service_role or sb_secret key.
 * No third-party SDK is needed to bundle this client.
 */
import type {Plan} from './travel';
import {publicTripSnapshot,type CommunityTrip} from './community-trips';
import {buildSocialAuthorizationUrl,parseSocialProviderSettings,unavailableSocialProviders,type SocialProvider,type SocialAvailability} from './social-auth';

declare const __VIAJA_SUPABASE_URL__: string;
declare const __VIAJA_SUPABASE_PUBLIC_KEY__: string;
const url = typeof __VIAJA_SUPABASE_URL__ === 'string' ? __VIAJA_SUPABASE_URL__.replace(/\/+$/,'') : '';
const key = typeof __VIAJA_SUPABASE_PUBLIC_KEY__ === 'string' ? __VIAJA_SUPABASE_PUBLIC_KEY__ : '';
const storageKey = 'viaja-auth-session-v1';
const authRedirect=()=>browser()?'?redirect_to='+encodeURIComponent(window.location.origin+'/'):'';
export const cloudReady = Boolean(url && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && key);
export type ViajaUser = {id:string;email?:string};
export type ViajaSession = {access_token:string;refresh_token:string;expires_at:number;user:ViajaUser};
const listeners = new Set<(s:ViajaSession|null)=>void>();
let current:ViajaSession|null = null;
let refreshing:Promise<ViajaSession|null>|null = null;

const browser = () => typeof window !== 'undefined';
function publish(s:ViajaSession|null) {
  current=s;
  if(browser()) {
    try {if(s) window.localStorage.setItem(storageKey,JSON.stringify(s)); else window.localStorage.removeItem(storageKey);}catch {}
  }
  for(const listener of listeners) listener(s);
}
export function subscribeAuth(listener:(s:ViajaSession|null)=>void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}
export function getCurrentSession(){return current;}
function ensureConfigured(){if(!cloudReady)throw Error('Supabase todavía no está configurado en esta versión de Viaja.');}
type JSONValue = Record<string,any>;
async function api<T=JSONValue>(path:string,init:RequestInit={},token?:string):Promise<T> {
  ensureConfigured();
  const headers = new Headers(init.headers);
  headers.set('apikey',key);
  headers.set('Content-Type','application/json');
  if(token) headers.set('Authorization','Bearer '+token);
  const response=await fetch(url+path,{...init,headers,cache:'no-store'});
  const data:JSONValue=await response.json().catch(()=>({})) as JSONValue;
  if(!response.ok) throw Error(String(data.msg||data.message||data.error_description||data.error||'No pudimos completar la solicitud.').slice(0,220));
  return data as T;
}
function acceptSession(data:JSONValue):ViajaSession {
  if(!data.access_token||!data.refresh_token||!data.user?.id)throw Error('La sesión recibida está incompleta.');
  const s:ViajaSession={access_token:String(data.access_token),refresh_token:String(data.refresh_token),
    expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600),
    user:{id:String(data.user.id),email:data.user.email}};
  publish(s);
  return s;
}
async function refresh():Promise<ViajaSession|null> {
  if(refreshing)return refreshing;
  refreshing=(async()=>{
    const old=current;
    if(!old)return null;
    try {
      return acceptSession(await api('/auth/v1/token?grant_type=refresh_token',
        {method:'POST',body:JSON.stringify({refresh_token:old.refresh_token})}));
    } catch(error) {
      publish(null);
      throw error;
    } finally {refreshing=null;}
  })();
  return refreshing;
}
export async function restoreAuth():Promise<ViajaSession|null> {
  if(!browser()||!cloudReady)return null;
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  const callbackError=hash.get('error_description')||hash.get('error');
  if(callbackError){window.history.replaceState({},'',window.location.pathname+window.location.search);throw Error(callbackError.slice(0,220));}
  if(hash.get('access_token')&&hash.get('refresh_token')) {
    try {
      const token=hash.get('access_token')!,refreshToken=hash.get('refresh_token')!;
      const user=await api<ViajaUser>('/auth/v1/user',{method:'GET'},token);
      const expires=Number(hash.get('expires_in')||3600);
      publish({access_token:token,refresh_token:refreshToken,expires_at:Math.floor(Date.now()/1000)+expires,user});
      if(hash.get('type')==='recovery') window.sessionStorage.setItem('viaja-password-recovery','1');
    } finally {window.history.replaceState({},'',window.location.pathname+window.location.search);}
  }
  if(!current) {
    try {
      const data=JSON.parse(window.localStorage.getItem(storageKey)||'null');
      if(data?.access_token && data?.refresh_token && data?.user?.id)current=data as ViajaSession;
    }catch {publish(null);}
  }
  if(!current)return null;
  if(current.expires_at<=Math.floor(Date.now()/1000)+90)return await refresh();
  try {
    const user=await api<ViajaUser>('/auth/v1/user',{method:'GET'},current.access_token);
    if(!user.id || user.id!==current.user.id)throw Error('Sesión inválida.');
    publish({...current,user:{id:user.id,email:user.email}});
    return current;
  }catch {return await refresh();}
}
export async function accessToken():Promise<string|null> {
  if(!current)return null;
  if(current.expires_at<=Math.floor(Date.now()/1000)+90)await refresh();
  return current?.access_token||null;
}
/** Read only published provider availability; never assume an OAuth provider works. */
export async function getSocialProviderAvailability():Promise<SocialAvailability> {
 if(!cloudReady)return {...unavailableSocialProviders};
 try{
  const settings=await api<unknown>('/auth/v1/settings',{method:'GET'});
  return parseSocialProviderSettings(settings);
 }catch {
  return {...unavailableSocialProviders};
 }
}
/** Browser redirect to Supabase's OAuth endpoint. Supabase handles identity verification. */
export function beginSocialSignIn(provider:SocialProvider) {
 ensureConfigured();
 if(!browser())throw Error('El acceso social está disponible desde el navegador.');
 const target=buildSocialAuthorizationUrl(url,provider,window.location.origin+'/');
 window.location.assign(target);
}
export async function register(email:string,password:string) {
  const data=await api('/auth/v1/signup'+authRedirect(),{method:'POST',body:JSON.stringify({email,password})});
  if(data.access_token)acceptSession(data);
  return Boolean(data.access_token);
}
export async function logIn(email:string,password:string) {
  return acceptSession(await api('/auth/v1/token?grant_type=password',
    {method:'POST',body:JSON.stringify({email,password})}));
}
export async function logOut() {
  const token=current?.access_token;
  publish(null);
  if(token)try {await api('/auth/v1/logout',{method:'POST'},token);}catch {}
}
export async function sendRecovery(email:string) {
  await api('/auth/v1/recover'+authRedirect(),{method:'POST',body:JSON.stringify({email})});
}
export function recoveryPending():boolean {
  return browser()&&window.sessionStorage.getItem('viaja-password-recovery')==='1';
}
export async function changePassword(password:string) {
  const token=await accessToken();
  if(!token)throw Error('El enlace ha vencido. Solicitá uno nuevo.');
  await api('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})},token);
  if(browser())window.sessionStorage.removeItem('viaja-password-recovery');
}
export async function db<T=JSONValue>(path:string,init:RequestInit={}):Promise<T> {
  const token=await accessToken();
  if(!token)throw Error('Iniciá sesión para guardar o consultar tus viajes.');
  return api<T>('/rest/v1/'+path,init,token);
}
/** Authenticated Storage requests use the active user's JWT and a publishable key only. */
export const storageApiBase = url+'/storage/v1';
export async function storageRequest<T=Record<string,unknown>>(path:string,init:RequestInit={}):Promise<T>{
 ensureConfigured();
 const token=await accessToken();
 if(!token)throw Error('Iniciá sesión para utilizar documentos privados.');
 const headers=new Headers(init.headers);
 headers.set('apikey',key);
 headers.set('Authorization','Bearer '+token);
 const response=await fetch(storageApiBase+'/'+path.replace(/^\/+/,''),
  {...init,headers,cache:'no-store'});
 const data=await response.json().catch(()=>({})) as Record<string,unknown>;
 if(!response.ok)throw Error(String(data.message||data.error||data.msg||'Error de almacenamiento privado.').slice(0,240));
 return data as T;
}
export async function listCloudTrips():Promise<Plan[]> {
  const [rows,members]=await Promise.all([
    db<{user_id:string;version:number;document:Plan}[]>('trips?select=user_id,version,document&order=updated_at.desc&limit=250'),
    db<{trip_id:string;user_id:string;role:'editor'|'viewer'}[]>('trip_members?select=trip_id,user_id,role&limit=1000')
  ]);
  if(!Array.isArray(rows))throw Error('No pudimos leer tus viajes.');
  return rows.map(r=>{
    const team=members.filter(m=>m.trip_id===r.document?.id);
    const role:'owner'|'editor'|'viewer'=r.user_id===current?.user.id?'owner':team.find(m=>m.user_id===current?.user.id)?.role||'viewer';
    return {...r.document,collaboration:{version:r.version,ownerId:r.user_id,role,memberCount:team.length+1}};
  }).filter(p=>p&&typeof p.id==='string'&&p.trip);
}
/** All writes use a version-checked RPC; a second editor cannot silently overwrite changes. */
export async function saveCloudTrip(p:Plan):Promise<number> {
  if(!current?.user.id)throw Error('Iniciá sesión para guardar.');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id))throw Error('Identificador de viaje inválido.');
  const {collaboration,...document}=p;
  return db<number>('rpc/viaja_save_shared_trip',{
    method:'POST',
    body:JSON.stringify({p_trip_id:p.id,p_document:document,p_expected_version:collaboration?.version??null})
  });
}
export async function deleteCloudTrip(id:string):Promise<void> {
  if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Identificador inválido.');
  const {deleteAllTripDocuments}=await import('./trip-documents');
  await deleteAllTripDocuments(id);
  await db('trips?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
}
export async function importLocalTrips():Promise<{imported:number}> {
  if(!browser()||!current)throw Error('Iniciá sesión antes de importar.');
  const raw=JSON.parse(window.localStorage.getItem('viaja-ai-trips-v1')||'[]');
  if(!Array.isArray(raw))throw Error('El respaldo local no tiene el formato esperado.');
  if(raw.length>250)throw Error('Hay demasiados viajes para importar en una sola operación.');
  const existing=new Set((await listCloudTrips()).map(p=>p.id));
  let imported=0;
  for(const item of raw) {
    if(!item?.trip||typeof item.trip!=='object')continue;
    const id=typeof item.id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(item.id)?item.id:crypto.randomUUID();
    if(existing.has(id))continue;
    await saveCloudTrip({...item,id} as Plan);
    existing.add(id);imported++;
  }
  // Deliberately keep local data as a backup. Import must never silently destroy it.
  return {imported};
}
if(browser())window.addEventListener('storage',event=>{
  if(event.key!==storageKey)return;
  try {const data=event.newValue?JSON.parse(event.newValue):null;current=data?.user?.id?data:null;listeners.forEach(fn=>fn(current));}catch {}
});

/** A trip is private until its owner explicitly confirms publication. */
export async function publishCommunityTrip(plan:Plan):Promise<CommunityTrip>{
 const owner=current?.user.id;
 if(!owner)throw Error('Iniciá sesión para publicar un viaje.');
 const payload=publicTripSnapshot(plan);
 // Never race with a pending save or bump the shared-trip version while publishing.
 if(!plan.collaboration?.version)throw Error('Esperá a que el viaje termine de guardarse en tu cuenta antes de publicarlo.');
 const rows=await db<CommunityTrip[]>('community_trips?on_conflict=source_trip_id&select=id,title,destination,days_count,pace,transport,content,published_at',{
  method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},
  body:JSON.stringify({...payload,source_trip_id:plan.id,user_id:owner,published:true,published_at:new Date().toISOString()})
 });
 if(!Array.isArray(rows)||!rows[0]?.id)throw Error('No pudimos confirmar la publicación. Volvé a intentarlo.');
 return rows[0];
}
export async function unpublishCommunityTrip(sourceTripId:string):Promise<void>{
 if(!current)throw Error('Iniciá sesión para retirar esta publicación.');
 if(!/^[0-9a-f-]{36}$/i.test(sourceTripId))throw Error('Viaje inválido.');
 await db('community_trips?source_trip_id=eq.'+encodeURIComponent(sourceTripId)+'&user_id=eq.'+encodeURIComponent(current.user.id),{
  method:'DELETE',headers:{Prefer:'return=minimal'}
 });
}
export async function listMyCommunityTrips():Promise<Record<string,string>>{
 const owner=current?.user.id;
 if(!owner)return {};
 const rows=await db<{source_trip_id:string;id:string}[]>('community_trips?select=source_trip_id,id&user_id=eq.'+encodeURIComponent(owner)+'&published=eq.true&limit=250');
 return Object.fromEntries((rows||[]).filter(row=>row.id&&row.source_trip_id).map(row=>[row.source_trip_id,row.id]));
}
/** Public catalogue: never reads the private trips table or exposes account email. */
export async function listCommunityTrips():Promise<CommunityTrip[]>{
 if(!cloudReady)return [];
 const cols='id,title,destination,days_count,pace,transport,content,published_at';
 const rows=await api<CommunityTrip[]>('/rest/v1/community_trips?select='+cols+'&published=eq.true&order=published_at.desc&limit=100');
 return Array.isArray(rows)?rows:[];
}
export async function getCommunityTrip(id:string):Promise<CommunityTrip|null>{
 if(!cloudReady||!/^[0-9a-f-]{36}$/i.test(id))return null;
 const cols='id,title,destination,days_count,pace,transport,content,published_at';
 const rows=await api<CommunityTrip[]>('/rest/v1/community_trips?select='+cols+'&published=eq.true&id=eq.'+encodeURIComponent(id)+'&limit=1');
 return Array.isArray(rows)?rows[0]||null:null;
}
