# Gemini Free Tier — Viaja staging (sin facturación)

Fecha: 29 de octubre de 2026. **Solo desarrollo/Preview; no lanzamiento público.**

## 1. Clave de API
- Google AI Studio → Projects → `Viaja` → `Crear clave de API`.
- Elegir el proyecto `Viaja` que aparece como **Nivel gratuito**.
- Guardar la clave (no pegar en ChatGPT, en GitHub, capturas o `VITE_`).
- Verificar en AI Studio → Límites de frecuencia qué modelos y cupos están asignados realmente al proyecto. El nivel Free depende de disponibilidad, país, región y cuotas.
- No activar Billing para este ensayo.

## 2. Cloudflare Preview
Dashboard → Workers & Pages → `viaja` → Settings → Variables and Secrets → **Preview**, NO Production.

| Variable | Tipo | Valor |
|---|---|---|
| `VIAJA_AI_PROVIDER` | Texto | `gemini` |
| `VIAJA_AI_ENABLED` | Texto | `true` solo al tener todas las demás variables |
| `GEMINI_API_KEY` | **Secret** | Nueva API key Gemini del proyecto Viaja |
| `SUPABASE_URL` | Texto | `https://ovagewbmrirzrlvbvtbw.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Texto | Clave `sb_publishable_...` del mismo proyecto Supabase |
| `SUPABASE_SECRET_KEY` | **Secret** | Clave privada `sb_secret_...` de Supabase solo backend |

Volver a desplegar la rama `feat/v1-production-release-plan` tras crear variables de entorno. Mantener la instancia `https://viaja.pages.dev/` y `main` sin cambios.

**No** reutilizar el OAuth Client Secret de Gmail: es un secreto distinto del de Gemini.

## 3. Comportamiento de la modalidad sin gastos
- Modelo de ensayo: `gemini-3.1-flash-lite`, generación por REST con JSON estructurado.
- No utiliza Google Search Grounding ni Maps Grounding, porque **no están incluidos en Free Tier para este modelo**.
- Genera únicamente ideas orientativas, no investigación verificada. El producto debe mostrar sin ambigüedades la diferencia.
- Hasta **7 días por itinerario**, 1–3 actividades sugeridas por día, sin información de precios, disponibilidad u horarios actuales.
- El backend autentica JWT consultando Supabase y reserva cupo de forma atómica: 2 generaciones por usuario por 24 horas, máximo 40 globales y un intervalo de 5 minutos. Las consultas fallidas cuentan contra cupo, para evitar abusos.
- La salida se valida, no se generan enlaces falsos ni se afirma que se realizó búsqueda web.

## 4. Pruebas pendientes (no declarar producción lista)
- Confirmar que la clave funciona con el modelo y cuota exactos desde AI Studio sin billing.
- Comprobar login Gmail, respuesta de `/api/status`, 401 sin sesión en `/api/plan`, 429 en límite.
- Probar viajes cortos y verificar que la estructura generada pasa la validación del servidor.
- Comprobar persistencia de los viajes y sincronización entre dispositivos.
- Comprobar que `/api/plan` solo se activa en Cloudflare Preview y que ningún secret aparece en HTML, bundle o respuestas.
- Confirmar que los usuarios de prueba no introducen datos privados: el nivel gratuito de Gemini puede usar entradas/salidas para mejorar los servicios.
- Antes de 1.0.0 pública, mapas/rutas, seguridad, privacidad, test de aislamiento y decisión sobre si queremos búsqueda web real.

Docs:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/structured-output
