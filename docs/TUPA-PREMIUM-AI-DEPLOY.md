# Tupã Travel Premium v1 — aplicación con IA aislada

Este documento corresponde a la rama `tupa-travel-v1`. **No desplegar esta rama en la producción de Viaja ni reutilizar las claves de Viaja**. La portada, navegación, planificación manual, recorridos de ejemplo, detalle, calendario, mapas, gastos, PDF y perfil ya están en la aplicación. La IA Gemini y las cuentas están integradas a nivel de código, pero **no funcionan hasta configurar una infraestructura independiente**.

## 1. Base de datos y autenticación independientes

1. **COMPLETADO (2026-11-02):** proyecto independiente `tupa-travel-production` creado en la organización `matiabad93's Org` (región `sa-east-1`). Su URL pública es `https://gerfdhhzpncqzunqyhmp.supabase.co`. El coste cotizado para crear el proyecto fue 0 USD/mes.
2. **COMPLETADO (2026-11-02):** migración `tupa_premium_initial_schema` aplicada únicamente al nuevo proyecto; fuente SQL: `supabase/tupa/setup.sql`. El archivo crea `trips`, `ai_usage`, políticas RLS por propietario y las funciones `tupa_reserve_ai_request` / `tupa_finalize_ai_request`. Nunca ejecutarlo contra `viaja-production`.
3. **PENDIENTE DE VALIDACIÓN EN EL ENTORNO PUBLICADO:** en Supabase Authentication habilitar email/password (y confirmación de email) y, si se desea, Google OAuth. Añadir URL HTTPS final y callback `<URL>/` a URL Configuration / redirect URLs.
4. **URL OBTENIDA Y CLAVE PÚBLICA VERIFICADA; NO COMMITTEARLA:** obtener desde el panel de Supabase la publishable key de Tupã para Cloudflare. La publishable key está permitida en el navegador; la secret key queda solamente en el servidor. Verificar que la tabla `trips` es accesible por la Data API (se incluye `GRANT` explícito) y que RLS impide que un usuario lea los viajes de otro.

## 2. Publicación en Cloudflare Pages independiente

Crear un **proyecto nuevo** de Cloudflare Pages, conectado al mismo repositorio `matiabad93/Viaja`, con rama de producción `tupa-travel-v1` y sin sobrescribir el proyecto `viaja`:

- Node.js 22, build: `npm ci --ignore-scripts && npm run build:demo`; output: `web-dist`.
- Variables de **build** (valores públicos, proyecto Tupa): `TUPA_SUPABASE_URL`, `TUPA_SUPABASE_PUBLISHABLE_KEY`.
- **Variables y Secrets de runtime** (Pages Functions): `TUPA_SUPABASE_URL` (texto), `TUPA_SUPABASE_PUBLISHABLE_KEY` (texto), `TUPA_SUPABASE_SECRET_KEY` (**secret**).
- IA Gemini (runtime): `TUPA_AI_PROVIDER=gemini`, `TUPA_GEMINI_API_KEY` (**secret**), `TUPA_GEMINI_KEY_ROTATED=true` (tras generar/verificar la clave), `TUPA_AI_ENABLED=true`.
- No configurar `VIAJA_AI_*`, `VIAJA_*` o las claves del proyecto de Viaja como sustitutos: no se aceptan en la API de Tupã.
- Mantener `TUPA_AI_ENABLED=false` mientras faltan cualquiera de los ajustes anteriores.

Usar una clave de Gemini del proyecto exclusivo de Tupã; verificar límites/cuotas y si la cuenta de Google tiene facturación habilitada. La capa de servidor admite OpenAI explícitamente con `TUPA_AI_PROVIDER=openai`, `TUPA_OPENAI_API_KEY` y opcional `TUPA_OPENAI_MODEL`, pero la opción inicial sugerida es Gemini. **Las claves nunca se guardan en GitHub o el frontend**.

## 3. Comprobar funcionamiento real

1. Desplegar y abrir la URL HTTPS del nuevo proyecto Pages.
2. Ir a Mi perfil → Entrar/Registrarme en la cabecera. Registrar un usuario Tupã y verificar la sesión.
3. GET `/api/status` sin token debe devolver `ready:false`, `reason:authentication_required`; con JWT válido de Tupã debe devolver `ready:true`, `provider:Gemini`.
4. Crear un viaje de 2–3 días → Generar itinerario con IA. Se envía el JWT únicamente al backend propio, se valida el usuario, se reserva una cuota, se llama a Gemini en servidor y se devuelve la agenda JSON. Los viajes se sincronizan con el proyecto Tupã.
5. Revisar `ai_usage`: máximo **10 generaciones por usuario en 24 horas** y **40 globales por 24 horas**, sin espera obligatoria de 5 minutos. Las reservas fallidas también cuentan; una generación simultánea se bloquea.
6. Iniciar sesión con otro usuario: sus viajes no deben exponer los del primero. Comprobar la exportación, edición y borrado. Revisar `get_advisors` de Supabase para seguridad y rendimiento.

Gemini genera **ideas orientativas sin búsqueda web, rutas, horarios ni reservas verificadas**. La aplicación exige validar datos y muestra las advertencias. No vende vuelos ni hoteles ni cobra pagos.

## 4. Modo sin configurar y pruebas

Sin variables, Tupã funciona en modo local sin IA y no se conecta a ninguna base de datos de Viaja. La rama se valida en GitHub Actions (TypeScript, build, smoke Chromium móvil/escritorio). La configuración de Cloudflare y Supabase **es una acción operativa indispensable**, no es reemplazable por modificar código.

```bash
git switch tupa-travel-v1
npm ci --ignore-scripts
npm run dev:demo
npm run build:demo
node --experimental-strip-types tests/tupa-demo.test.mts
```

Aún requiere consentimiento comercial para publicarla oficialmente con la marca y contenidos de la agencia. El HTML mantiene `noindex` hasta esa aprobación.

## Estado verificado el 2 de noviembre de 2026

- Supabase proyecto `gerfdhhzpncqzunqyhmp`: `ACTIVE_HEALTHY`.
- RLS activado en `public.trips` y `public.ai_usage`; cuatro políticas por propietario en `trips`.
- Los roles `anon` y `authenticated` no pueden ejecutar las RPC de cuota; sí el rol de servicio.
- Usuarios anónimos sin privilegio de lectura sobre viajes ni consumo IA.
- RPC de cuota rechaza un `user_id` nulo; test SQL correcto.
- Auditores informan índices sin uso (esperado al estrenar tablas) y ausencia intencional de política de lectura en `ai_usage`.
- **Pendiente:** proyecto Cloudflare Pages propio, variables build/runtime y secretos, configuración de redirección Auth y prueba de generación real con Gemini. No se reutilizan secretos existentes de Viaja.


## 5. Publicación automática desde GitHub, SIN ChatGPT Work

Este repositorio tiene un workflow exclusivo para Tupã en `.github/workflows/tupa-cloudflare-publish.yml`. Se ejecuta en **push a `tupa-travel-v1` únicamente si** la variable del repositorio `TUPA_RELEASE_ENABLED` tiene el valor `true`. `main` y Viaja no se modifican. El workflow usa la configuración Wrangler `wrangler.jsonc`, crea/reutiliza solo el proyecto Pages `tupa-travel`, verifica la clave de Gemini con un endpoint de solo lectura, carga secretos de backend, publica y valida `/api/status`.

### Configuración única, directamente en tus paneles (NO escribir claves en chats ni commits)

1. En **GitHub → matiabad93/Viaja → Settings → Secrets and variables → Actions → Repository secrets**, crear exactamente estos cuatro secretos:
   - `TUPA_CF_API_TOKEN`: token de Cloudflare restringido a la cuenta y permisos de **Cloudflare Pages Edit**, desde el panel Cloudflare → API Tokens.
   - `TUPA_CF_ACCOUNT_ID`: identificador de la cuenta Cloudflare correspondiente a ese token.
   - `TUPA_GEMINI_API_KEY`: clave **nueva y exclusiva** de Tupã creada en Google AI Studio. Revisar límites del plan y facturación antes de usarla.
   - `TUPA_SUPABASE_SECRET_KEY`: clave de servidor **secret** (no la publishable ni anon) del proyecto Supabase `gerfdhhzpncqzunqyhmp`, obtenida desde su panel API Keys.
2. Revisar los posibles costes/consumos y los permisos del token. En GitHub → **Settings → Secrets and variables → Actions → Variables**, crear `TUPA_RELEASE_ENABLED` con valor `true` únicamente cuando se autorice el lanzamiento.
3. Hacer un nuevo commit solo en `tupa-travel-v1` para disparar el workflow. Si estás usando ChatGPT en esta conversación, avisar **«Ya configuré los cuatro secretos y habilité TUPA_RELEASE_ENABLED»**; entonces puedo realizar el commit y comprobar el run desde GitHub.
4. Comprobar `https://tupa-travel.pages.dev/` y `https://tupa-travel.pages.dev/api/status`. El endpoint sin token debe indicar `reason: authentication_required` (IA habilitada, acceso protegido); si dice `configuration_incomplete`, hay claves o variables incompletas. Después verificar un login y una generación real de Gemini.

**Importante:** el workflow no crea ni habilita una clave de Gemini por sí mismo; tampoco configura el proveedor de OAuth Google o los redirects de Auth de Supabase. Estas acciones deben realizarse en sus paneles. La URL final puede variar si el subdominio `tupa-travel.pages.dev` ya está ocupado; el workflow falla en ese caso y debe ajustarse explícitamente antes de publicar.

El workflow se activa por `push` con una variable de autorización porque los flujos `workflow_dispatch` que solo existen en una rama no predeterminada no se pueden disparar desde la UI de GitHub sin publicar también el workflow en `main`. No modificamos `main` para resolverlo.

**Estado de verificación:** código y CI comprobados. Publicación real, credenciales de Gemini y prueba funcional autenticada siguen pendientes hasta completar estos pasos. No atribuir a Tupã tráfico o facturación de Viaja.
