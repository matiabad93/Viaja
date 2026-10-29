# Viaja 1.0.0 — configurar acceso social (Gmail y Facebook)

Los botones para estos dos proveedores están implementados en la **rama de staging**. Viaja consulta `GET /auth/v1/settings` de Supabase y **solo habilita el proveedor si aparece como activo**. Antes de introducir credenciales, el acceso por correo y contraseña sigue siendo la opción funcional.

> **Decisión de producto (29-10-2026):** Viaja ofrecerá solamente **«Continuar con Gmail»** (proveedor `google` de Supabase Auth), **«Continuar con Facebook»** y acceso por correo y contraseña. **No** ofrecerá Apple. «Gmail» aquí significa iniciar sesión con la identidad de Google y **no concede acceso a los correos del usuario**. La integración para importar reservas desde Gmail sería una funcionalidad distinta, con autorización y permisos específicos.

## Proyecto y redirecciones
- Supabase project: `viaja-production` (ref `ovagewbmrirzrlvbvtbw`).
- **Callback de OAuth en Google/Apple/Facebook (no es la URL de Cloudflare):**
  `https://ovagewbmrirzrlvbvtbw.supabase.co/auth/v1/callback`.
- URL final de la app: `https://viaja.pages.dev/`.
- Preview de rama: `https://feat-v1-production-release-p.viaja.pages.dev/`.
- Ambas URL de Viaja deben estar en Authentication → URL Configuration → Redirect URLs. Cuando el usuario elige un proveedor, Viaja envía el origen actual como `redirect_to` y vuelve a ese mismo sitio tras pasar por Supabase.
- **Nunca subir `client_secret`, claves privadas de Apple ni tokens de usuario a GitHub, Cloudflare como variables públicas, capturas compartidas o frontend.** Guardarlos en la configuración correspondiente dentro de Supabase.

## Prioridad de lanzamiento
1. **Gmail (Google OAuth) primero** (alta adopción y configuración directa).
2. **Facebook segundo** (Meta for Developers, permisos email, modo Live y validación de permisos/identidad según corresponda).
3. Conservar **email y contraseña** como alternativa, más recuperación y verificación de correo.

## Google: tarea de configuración para el propietario
1. Entrar a Google Cloud Console → Google Auth Platform → Branding/Audience. Crear una aplicación OAuth, público externo y consentimiento adecuado. Usar el nombre `Viaja`; limitar scopes a identidad (`openid`, email, perfil), **no pedir Gmail ni Drive** para iniciar sesión.
2. Crear credencial OAuth Client ID de tipo **Web application**.
3. Orígenes JavaScript autorizados:
   - `https://viaja.pages.dev`
   - `https://feat-v1-production-release-p.viaja.pages.dev`
4. Authorized redirect URI: `https://ovagewbmrirzrlvbvtbw.supabase.co/auth/v1/callback` (exactamente).
5. Copiar el Client ID y el Client Secret en Supabase → Authentication → Sign In / Providers → Google; habilitar y guardar.
6. Probar un usuario Google de prueba. Si el consentimiento está en modo testing, incluir su email como test user o publicar el OAuth consent screen siguiendo las reglas de Google. Comprobar que vuelve a la preview y se crea una cuenta en Supabase Auth.

Documentación: https://supabase.com/docs/guides/auth/social-sign-in/auth-google

## Facebook (Meta)
1. Crear una aplicación en https://developers.facebook.com con Facebook Login, según las opciones vigentes para tu cuenta.
2. Registrar el callback exacto de Supabase; configurar permiso email.
3. Cargar App ID/App Secret en Supabase → Authentication → Sign In / Providers → Facebook.
4. Asegurar que la app Meta esté habilitada para público (Live, si corresponde) y probar cuentas fuera de la lista de administradores/testers.

Documentación: https://supabase.com/docs/guides/auth/social-sign-in/auth-facebook

## Criterios de aceptación (staging)
- Los dos botones se muestran siempre, pero si un proveedor no está habilitado, el botón permanece desactivado con etiqueta «Próximamente»; no hay error de redirección ni promesa engañosa.
- Un proveedor habilitado inicia el flujo oficial OAuth en Supabase y retorna al mismo dominio donde comenzó.
- Estado de sesión válido y `auth.users` tiene la identidad conectada.
- Un viaje guardado en la cuenta se recupera al cerrar e iniciar sesión en otro navegador, sin atribuirlo a otro usuario.
- Probar que OAuth no permite leer viajes de otra cuenta (RLS).
- Si el proveedor no da email/lo oculta, manejar perfil incompleto con seguridad; probar reconciliación/relación de identidades según Supabase antes de abrir al público.
- No confundir **Google login** con **Gmail integration**. Leer reservas desde Gmail requerirá consentimiento OAuth independiente y permisos específicos; no está implementado.
- No fusionar con main hasta pasar pruebas con credenciales reales.
