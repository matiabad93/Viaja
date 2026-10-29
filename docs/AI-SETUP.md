# Viaja — Configuración segura de IA en Cloudflare Pages

Esta guía aplica a **Preview** del proyecto Pages `viaja`. No habilites producción desde esta guía.

## Estado del proveedor

Viaja usa Gemini cuando `VIAJA_AI_PROVIDER` está ausente o vale `gemini`. Un proveedor desconocido falla cerrado. OpenAI solo se usa si se selecciona explícitamente `VIAJA_AI_PROVIDER=openai`; no es el fallback.

La integración Gemini incluida usa `gemini-3.1-flash-lite` mediante Gemini API `generateContent`, con salida JSON estructurada. La generación crea ideas de itinerario y **no consulta web, mapas, horarios ni reservas en tiempo real**. Debe mostrarse como contenido tentativo sin fuentes verificadas.

Google publica actualmente el modelo como estable y con tarifa Free Tier para entrada/salida de texto; el grounding de Google Search/Maps no está disponible en Free Tier para este modelo. Consultá las páginas oficiales antes de cambiar el modelo o el plan:
- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits

El nivel efectivo y sus límites pueden depender del proyecto de AI Studio. No asumas que una API key está limitada al nivel gratuito si el proyecto tiene facturación habilitada.

## Variables de ejecución de Pages Functions

Cloudflare Dashboard → Workers & Pages → `viaja` → Settings → Variables and Secrets → **Preview**. Configurá estas variables de runtime; las variables `VITE_*` de compilación no sustituyen los bindings de Pages Functions.

| Nombre | Tipo | Valor esperado |
|---|---|---|
| `VIAJA_AI_ENABLED` | Text | `true` solo después de validar todas las variables |
| `VIAJA_AI_PROVIDER` | Text | `gemini` |
| `GEMINI_API_KEY` | Secret | Una clave nueva de Google AI Studio, después de revocar la expuesta |
| `SUPABASE_URL` | Text | `https://ovagewbmrirzrlvbvtbw.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Text | Clave publicable del proyecto `viaja-production` |
| `SUPABASE_SECRET_KEY` | Secret | Clave secreta del proyecto, solo para Functions |

No cargues la clave Gemini en el frontend ni en una variable `VITE_*`. No imprimas valores secretos en logs. No configures `OPENAI_API_KEY` ni selecciones OpenAI para probar Gemini.

## Activación segura en Preview

1. Rotá en Google AI Studio la clave que pudo quedar visible; guardá la nueva clave directamente como Secret `GEMINI_API_KEY` en el entorno **Preview**.
2. Configurá `SUPABASE_SECRET_KEY` como Secret y los valores públicos de Supabase como Text.
3. Configurá `VIAJA_AI_PROVIDER=gemini`.
4. Revisá el proyecto de AI Studio y confirmá que permanece sin facturación asociada si el requisito es no incurrir en cargos.
5. Habilitá `VIAJA_AI_ENABLED=true` en **Preview**. No copies esta configuración a Production.
6. Desplegá/reintentá el último deployment de la rama de Preview.
7. En una sesión autenticada de la app, consultá `/api/status`: debe devolver `ready:true`, `provider:"Gemini"` y `mode:"ideas_without_search"`. Sin sesión, `ready:false` es lo esperado.
8. Probá una generación real; verificá respuesta, actividad en `ai_usage` y el viaje recuperado desde Supabase.

La respuesta de `/api/status` no muestra secretos. `configuration_incomplete` indica que falta al menos una variable requerida o que la IA está deshabilitada; el endpoint no identifica cuál para evitar revelar configuración privada.

## Límites y seguridad de uso

El gateway requiere token de Supabase Auth, valida el usuario y reserva cuota transaccional antes de llamar al proveedor. Los límites iniciales son 2 solicitudes por usuario cada 24 horas, 40 globales cada 24 horas y 5 minutos entre solicitudes. Los intentos fallidos también consumen la reserva para prevenir abuso. Estos topes son de peticiones, no un presupuesto monetario.

Gemini devuelve ideas sin búsqueda. La aplicación debe advertir que ubicaciones, precios, horarios y disponibilidad requieren verificación independiente. Si Gemini responde 429/4xx o falla la validación del JSON, el borrador del viaje debe conservarse y no deben presentarse resultados simulados.

## Privacidad

La clave Gemini y la clave secreta de Supabase se mantienen solo en bindings Secret de Pages Functions. Las solicitudes de planificación requieren un token válido de Supabase Auth. No subas secretos a GitHub, al bundle del cliente o a capturas.