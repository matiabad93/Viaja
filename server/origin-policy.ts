/** Narrow CORS exception for trusted Capacitor WebView origins.
 * This is NOT authentication: JWT and RLS are always required by private routes. */
export const CAPACITOR_ORIGINS=['https://localhost','capacitor://localhost'] as const;
export function isAllowedApiOrigin(request:Request):boolean{
 const origin=request.headers.get('origin');
 return Boolean(origin)&&(origin===new URL(request.url).origin||CAPACITOR_ORIGINS.includes(origin as typeof CAPACITOR_ORIGINS[number]));
}
export function capacitorCorsOrigin(request:Request):string|null{
 const origin=request.headers.get('origin');
 return origin&&CAPACITOR_ORIGINS.includes(origin as typeof CAPACITOR_ORIGINS[number])?origin:null;
}
