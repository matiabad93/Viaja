# Viaja 1.0.0 — IA pública con límites (STAGING)

Estado (29/10/2026): **código y cuotas preparados, IA NO activada, pruebas reales de OpenAI pendientes**.

## Qué existe
- Cloudflare Pages Function `/api/plan` ahora entra por `server/ai-gateway.ts`, que valida identidad mediante Supabase Auth `/auth/v1/user`, origen, JSON, tamaño y parámetros del viaje.
- El servidor usa `server/planner.ts` existente para crear itinerarios y consultar fuentes web de OpenAI; las cabeceras de identidad antiguas se sustituyen **solo después** de validar criptográficamente el token en Supabase.
- Supabase: migración `202610290002_ai_quotas.sql` aplicada al proyecto `viaja-production`. Funciones `viaja_reserve_ai_request` y `viaja_finalize_ai_request` solo invocables desde backend con rol privilegiado.
- Cupo inicial: **2 generaciones por usuario en 24 horas móviles, 40 globales por 24 horas, mínimo 5 minutos entre peticiones**. Tanto las fallidas como las exitosas cuentan por defecto: es intencional para proteger costes. `/api/plan` falla cerrado si la cuota no puede verificarse.
- `/api/status` solo anuncia IA disponible si están todas las variables configuradas y el usuario autenticado.

## Configurar en Cloudflare Pages (solo después de revisar el límite de gasto)
Cloudflare Dashboard → Workers & Pages → `viaja` → Settings → Variables and Secrets → **Preview environment**:

| Nombre | Tipo | Valor |
|---|---|---|
| `VIAJA_AI_ENABLED` | Texto | `true` **solo tras confirmar el resto** |
| `OPENAI_API_KEY` | **Secret** | Clave nueva de OpenAI Platform, creada para Viaja |
| `SUPABASE_URL` | Texto | `https://ovagewbmrirzrlvbvtbw.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Texto | La clave pública `sb_publishable_...` del proyecto `viaja-production` |
| `SUPABASE_SECRET_KEY` | **Secret** | La clave `sb_secret_...` de Supabase. No usarla en `VITE_` ni en Git. |
| `OPENAI_MODEL` | Texto opcional | `gpt-4.1-mini` (valor predeterminado en el gateway) |

**Importante:** comprobar que Cloudflare distingue `Preview` de `Production`: configurar primero **Preview** para probar `https://feat-v1-production-release-p.viaja.pages.dev/`. Mantener `VIAJA_AI_ENABLED` sin configurar o `false` en producción. Redeploy de la rama tras configurar secretos.

### Costes / límites
El límite de 2 usuario/40 global es de **peticiones**, no de gasto en USD. Cada solicitud puede usar varios pasos de búsqueda y tokens. Configurar también límites y alertas de presupuesto en OpenAI Platform; revisar consumos reales después de cada prueba. No interpretar el límite de Supabase como un presupuesto monetario infalible.

No hace falta una suscripción ChatGPT para la integración: la facturación de API es independiente del plan ChatGPT.

## Pruebas imprescindibles antes de activar en producción
1. Invitado sin sesión: `/api/plan` nunca puede llamar OpenAI y devuelve 401 cuando está configurado.
2. Petición válida pero con token expirado o inventado: 401, ningún consumo.
3. Sesión Gmail real: crea un viaje con IA, devuelve itinerario, fuentes y gasto aproximado desde OpenAI Platform.
4. Usuario repetidor: segunda generación dentro de 5 minutos da 429, al cabo de 5 minutos puede usar su segundo cupo, la tercera en 24 horas da 429.
5. Datos inválidos/muy grandes/origen distinto: 400/413/403 sin consumo.
6. Verificar que secretos nunca lleguen a frontend, logs, cachés o archivos del repositorio.
7. Pruebas de carga/concurrencia (cuota SQL transaccional), sesión de dos usuarios y RLS de viajes.
8. Simular errores OpenAI, cuotas globales, falta de conectividad y persistencia del borrador.
9. Revisar que las citas y URLs sean reales; no asegurar disponibilidad de vuelos/hoteles ni precios no comprobados.

## Limitaciones / pendientes
- La salida JSON del planificador se valida pero aún no se ha probado con una llamada de API real; si falla el esquema, ajustar `text.format` a JSON Schema estricta y hacer test completo.
- Aún no hay límites globales en **dólares** ni comprobación de coste por modelo/token en `ai_usage`; hay cuota de peticiones y límites configurables de OpenAI.
- Los mapas con rutas internas, persistencia de favoritos/guías, pruebas E2E de dispositivos y textos legales siguen fuera de este PR.
- No fusionar a `main` ni etiquetar `v1.0.0` hasta terminar las pruebas.

Referencias:
- https://supabase.com/docs/guides/getting-started/api-keys
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.cloudflare.com/pages/functions/bindings/
