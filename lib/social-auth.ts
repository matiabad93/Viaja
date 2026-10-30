/**
 * Supported Viaja 1.0.0 social sign-in methods.
 *
 * These are only entry points to Supabase Auth. No Google or Meta
 * OAuth secrets are ever stored in the frontend.
 */
export const socialProviders=['google','facebook'] as const;
export type SocialProvider=(typeof socialProviders)[number];
export type SocialAvailability=Record<SocialProvider,boolean>;
export const unavailableSocialProviders:SocialAvailability={google:false,facebook:false};

export function parseSocialProviderSettings(settings:unknown):SocialAvailability{
 const external=settings&&typeof settings==='object'&&'external' in settings
  ?(settings as {external:unknown}).external:null;
 const enabled=external&&typeof external==='object'?external as Record<string,unknown>:{};
 return {
  google:enabled.google===true,
  facebook:enabled.facebook===true
 };
}

/** Return an HTTPS authorization URL for an allowed provider and redirect.
 * The redirect must already be allowed in Supabase Authentication settings.
 */
export function buildSocialAuthorizationUrl(baseURL:string,provider:SocialProvider,redirectTo:string):string {
 if(!socialProviders.includes(provider))throw Error('Proveedor de acceso no admitido.');
 const base=new URL(baseURL);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')
  throw Error('La URL de Supabase no es válida.');
 const redirect=new URL(redirectTo);
 const local=redirect.hostname==='localhost'||redirect.hostname==='127.0.0.1';
 if(!(redirect.protocol==='https:'||(local&&redirect.protocol==='http:'))||redirect.username||redirect.password)
  throw Error('La dirección de regreso no es segura.');
 const authorize=new URL('/auth/v1/authorize',base);
 authorize.searchParams.set('provider',provider);
 authorize.searchParams.set('redirect_to',redirect.toString());
 return authorize.toString();
}
