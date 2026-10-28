/** Same-origin API on web; native builds use the explicitly configured public backend.
 * No credentials are embedded in either build. */
declare const __VIAJA_NATIVE__: boolean;
declare const __VIAJA_API_BASE__: string;
export async function requestAPI(path: string, init?: RequestInit): Promise<Response> {
 const native=typeof __VIAJA_NATIVE__!=='undefined'&&__VIAJA_NATIVE__;
 const base=typeof __VIAJA_API_BASE__==='string'?__VIAJA_API_BASE__:'';
 if(native&&!base){
  if(path==='/api/status')return Response.json({ready:false,admin:false,demo:true});
  if(path.startsWith('/api/photos?')){
   const q=new URL(path,'https://local.invalid').searchParams.get('q')||'';
   const {paris,colmar,barcelona,roma,lisboa}=await import('../server/builtin-photos');
   const photos=({paris,colmar,barcelona,roma,lisboa} as Record<string,typeof paris>)[q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()];
   return Response.json({photos:photos||[],error:photos?undefined:'La galería de este destino requiere conectar el backend público.'},{status:photos?200:503});
  }
  return Response.json({error:'El backend público todavía no está configurado en esta compilación.'},{status:503});
 }
 return fetch(base+path,init);
}
