import {secureAIGateway,type ViajaAIEnv} from '../../server/ai-gateway';

/** Apply defensive response headers to dynamic Cloudflare Pages Functions.
 * The public/_headers file only affects static responses, NOT Pages Functions.
 */
export const onRequest:PagesFunction<ViajaAIEnv> = async ({request,env}) => {
 const result=await secureAIGateway(request,env||{});
 const headers=new Headers(result.headers);
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('X-Frame-Options','DENY');
 headers.set('Referrer-Policy','no-referrer');
 headers.set('Cross-Origin-Resource-Policy','same-origin');
 headers.set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
 if(!headers.has('Cache-Control'))headers.set('Cache-Control','no-store');
 return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
};
