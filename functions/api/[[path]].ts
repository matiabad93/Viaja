import {secureAIGateway,type ViajaAIEnv} from '../../server/ai-gateway';
import {capacitorCorsOrigin} from '../../server/origin-policy';

/** Cloudflare Pages API security + explicitly restricted Capacitor WebView CORS.
 * CORS never replaces JWT verification or RLS for private APIs. */
export const onRequest:PagesFunction<ViajaAIEnv> = async ({request,env}) => {
 const capacitorOrigin=capacitorCorsOrigin(request);
 let result:Response;
 if(request.method==='OPTIONS'){
  const expected=request.headers.get('access-control-request-method')||'';
  if(!capacitorOrigin)result=Response.json({error:'Origen no permitido'},{status:403});
  else if(expected!=='GET'&&expected!=='POST')result=Response.json({error:'Método no permitido'},{status:405});
  else result=new Response(null,{status:204});
 }else{
  result=await secureAIGateway(request,env||{});
 }
 const headers=new Headers(result.headers);
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('X-Frame-Options','DENY');
 headers.set('Referrer-Policy','no-referrer');
 headers.set('Cross-Origin-Resource-Policy','same-origin');
 headers.set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
 if(!headers.has('Cache-Control'))headers.set('Cache-Control','no-store');
 if(capacitorOrigin){
  headers.set('Access-Control-Allow-Origin',capacitorOrigin);
  headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers','authorization, content-type');
  headers.set('Access-Control-Max-Age','600');
  headers.set('Vary',[headers.get('Vary'),'Origin'].filter(Boolean).join(', '));
 }
 return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
};
