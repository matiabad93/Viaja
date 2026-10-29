import {destinationsAPI} from './destinations';
import {plannerAPI,validateTrip} from './planner';
import {geminiFreePlanner,FREE_GEMINI_MODEL} from './gemini-planner';

export type ViajaAIEnv={
 GEMINI_API_KEY?:string;
 GEMINI_KEY_ROTATED?:string;
 VIAJA_AI_PROVIDER?:string;
 OPENAI_API_KEY?:string;
 OPENAI_MODEL?:string;
 VIAJA_AI_ENABLED?:string;
 SUPABASE_URL?:string;
 SUPABASE_PUBLISHABLE_KEY?:string;
 SUPABASE_SECRET_KEY?:string;
};
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const baseUrl=(env:ViajaAIEnv)=>env.SUPABASE_URL||'https://ovagewbmrirzrlvbvtbw.supabase.co';
const publicKey=(env:ViajaAIEnv)=>env.SUPABASE_PUBLISHABLE_KEY||'';
type AIProvider='gemini'|'openai'|'unsupported';
const provider=(env:ViajaAIEnv):AIProvider=>{
 const selected=env.VIAJA_AI_PROVIDER?.trim().toLowerCase();
 if(!selected||selected==='gemini')return 'gemini';
 if(selected==='openai')return 'openai';
 return 'unsupported';
};
const providerLabel=(env:ViajaAIEnv)=>provider(env)==='gemini'?'Gemini':provider(env)==='openai'?'OpenAI':null;
const configured=(env:ViajaAIEnv)=>{
 const selected=provider(env);
 const providerReady=selected==='gemini'
  ? Boolean(env.GEMINI_API_KEY&&env.GEMINI_KEY_ROTATED==='true')
  : selected==='openai' ? Boolean(env.OPENAI_API_KEY) : false;
 return env.VIAJA_AI_ENABLED==='true'&&selected!=='unsupported'&&providerReady&&Boolean(env.SUPABASE_SECRET_KEY&&publicKey(env));
};

type SupabaseUser={id:string;email?:string;role?:string;is_anonymous?:boolean};
async function resolveUser(request:Request,env:ViajaAIEnv):Promise<SupabaseUser|null>{
 const auth=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(auth)||!publicKey(env))return null;
 try{
  const result=await fetch(baseUrl(env)+'/auth/v1/user',{
   method:'GET',headers:{apikey:publicKey(env),Authorization:auth},
   cache:'no-store',signal:AbortSignal.timeout(7000)
  });
  if(!result.ok)return null;
  const user=await result.json() as SupabaseUser;
  if(!user.id||user.role==='anon'||user.is_anonymous===true)return null;
  return user;
 }catch{return null}
}
async function invokeQuota(env:ViajaAIEnv,name:'viaja_reserve_ai_request'|'viaja_finalize_ai_request',payload:unknown){
 if(!env.SUPABASE_SECRET_KEY)throw Error('Quota server is not configured');
 const res=await fetch(baseUrl(env)+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},
  body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(9000)
 });
 if(!res.ok)throw Error('Quota store unavailable');
 return res.json() as Promise<any>;
}

/** The sole public entry point to paid AI: authenticated user, valid payload,
 * atomic usage reservation, and fail-closed handling on errors.
 */
export async function secureAIGateway(request:Request,env:ViajaAIEnv):Promise<Response>{
 const path=new URL(request.url).pathname;
 const destinations=await destinationsAPI(request);
 if(destinations)return destinations;
 if(path!=='/api/status'&&path!=='/api/plan')return response({error:'No encontrado'},404);
 if(path==='/api/status'){
  if(request.method!=='GET')return response({error:'Método no permitido'},405);
  if(!configured(env))return response({ready:false,admin:false,restricted:true,reason:provider(env)==='unsupported'?'provider_unsupported':'configuration_incomplete',provider:providerLabel(env),mode:provider(env)==='gemini'?'ideas_without_search':provider(env)==='openai'?'researched':null});
  const user=await resolveUser(request,env);
  return response({ready:Boolean(user),admin:false,restricted:!user,reason:user?'ready':'authentication_required',loginRequired:!user,provider:providerLabel(env),search:provider(env)==='gemini'?'none':provider(env)==='openai'?'web_search':null,mode:provider(env)==='gemini'?'ideas_without_search':provider(env)==='openai'?'researched':null});
 }
 if(request.method!=='POST')return response({error:'Método no permitido'},405);
 if(!configured(env))return response({code:'AI_NOT_CONFIGURED',error:'La IA todavía está en preparación. Podés seguir guardando viajes.'},503);
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Origen no permitido'},403);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return response({error:'Formato inválido'},415);
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isFinite(length)||length>16000)return response({error:'Solicitud demasiado extensa'},413);
 const user=await resolveUser(request,env);
 if(!user)return response({code:'AUTH_REQUIRED',error:'Iniciá sesión con Gmail o tu correo para generar un viaje con IA.'},401);
 try{
  const raw=await request.clone().text();
  if(raw.length>16000)return response({error:'Solicitud demasiado extensa'},413);
  validateTrip(JSON.parse(raw));
 }catch(e){return response({error:e instanceof Error?e.message:'Datos inválidos'},400)}
 const requestId=crypto.randomUUID();
 let admission;
 try{admission=await invokeQuota(env,'viaja_reserve_ai_request',{p_user_id:user.id,p_request_id:requestId})}
 catch{return response({error:'El control de uso no está disponible. No se realizó ninguna consulta de IA.'},503)}
 if(!admission?.allowed){
  const reason=admission?.reason==='user_daily_limit'?'Alcanzaste las 2 investigaciones permitidas cada 24 horas.':
    admission?.reason==='global_daily_limit'?'Viaja alcanzó su límite diario de investigaciones.':
    admission?.reason==='cooldown'?'Esperá cinco minutos antes de generar otro plan.':
    admission?.reason==='request_in_progress'?'Ya hay una investigación reciente en curso.':
    'No se pudo habilitar esta investigación.';
  return response({code:'AI_RATE_LIMIT',error:reason},429);
 }
 let success=false;
 try{
  // The legacy planner expects owner headers from its previous hosting system.
  // Replace client-controlled values with values returned by Supabase Auth.
  if(provider(env)==='gemini'){
   const result=await geminiFreePlanner(request,{GEMINI_API_KEY:env.GEMINI_API_KEY});
   success=result.ok;
   return result;
  }
  const verifiedHeaders=new Headers(request.headers);
  verifiedHeaders.delete('oai-authenticated-user-id');
  verifiedHeaders.delete('oai-authenticated-user-email');
  verifiedHeaders.set('oai-authenticated-user-id',user.id);
  verifiedHeaders.set('oai-authenticated-user-email',user.email||'authenticated@viaja.invalid');
  const verifiedRequest=new Request(request,{headers:verifiedHeaders});
  const result=await plannerAPI(verifiedRequest,{
   OPENAI_API_KEY:env.OPENAI_API_KEY,
   OPENAI_MODEL:env.OPENAI_MODEL||'gpt-4.1-mini',
   VIAJA_OWNER_EMAIL:user.email||'authenticated@viaja.invalid'
  });
  success=result.ok;
  return result;
 }catch{return response({error:'No se pudo completar la investigación. El borrador continúa disponible.'},502)}
 finally{
  try{await invokeQuota(env,'viaja_finalize_ai_request',{
   p_request_id:requestId,p_status:success?'completed':'failed',p_model:provider(env)==='gemini'?FREE_GEMINI_MODEL:(env.OPENAI_MODEL||'gpt-4.1-mini')
  })}catch{/* The reserved request still counts toward limits if completion update fails. */}
 }
}
