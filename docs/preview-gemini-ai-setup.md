# Habilitar Gemini en Viaja 2.0 Preview

Fecha: 2026-11-05. **No hay que tocar el proyecto de producción.**

## Diagnóstico comprobado

- `https://feat-viaja-guided-planner-v2.viaja.pages.dev/api/status` devolvió `{"ready":false,"reason":"configuration_incomplete","provider":"Gemini"}`.
- `https://viaja.pages.dev/api/status` devolvió `{"ready":false,"reason":"authentication_required","provider":"Gemini"}`: backend configurado, pero la API requiere JWT de usuario.
- Por tanto, **la IA del Preview no está habilitada por variables/secretos del entorno**. No es un fallo de los sliders ni de las preferencias.

## Configuración segura en Cloudflare Pages

1. Abrir [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → `viaja` → **Settings** → **Variables and Secrets** (o «Environment variables», según UI).
2. Seleccionar **Preview**, no Production.
3. Revisar o configurar los valores que exige `server/ai-gateway.ts`:

| Nombre | Tipo | Valor esperado / origen |
|---|---|---|
| `VIAJA_AI_ENABLED` | Variable de texto | `true` |
| `VIAJA_AI_PROVIDER` | Variable de texto | `gemini` |
| `GEMINI_API_KEY` | **Secret** | Una API Key válida, preferentemente dedicada a Preview, creada en Google AI Studio |
| `GEMINI_KEY_ROTATED` | Variable de texto | `true` **solo cuando se haya emitido una clave nueva no expuesta** |
| `SUPABASE_URL` | Variable de texto | URL del **proyecto Supabase de Preview** cuando exista |
| `SUPABASE_PUBLISHABLE_KEY` | Variable de texto / publishable | Publishable key del mismo proyecto Supabase |
| `SUPABASE_SECRET_KEY` | **Secret** | Secret backend del mismo proyecto Supabase, nunca en cliente, código, GitHub ni chat |

El backend exige `GEMINI_KEY_ROTATED=true`, un `GEMINI_API_KEY` no vacío, ambos parámetros de Supabase y `VIAJA_AI_ENABLED=true`. Esto es deliberado: el backend protege cuotas, autentica usuarios y no debe llamar a Gemini en un entorno sin configuración segura.

**Importante: aislamiento de entornos.** Para una Preview que use IA con usuarios de prueba, preferir Supabase separado de producción y configurar además `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` en el build de Preview para que el cliente y el backend apunten al mismo proyecto. No copiar automáticamente un secret key de producción a Preview, porque daría acceso del backend en pruebas a datos reales y cuotas de producción. Si todavía no existe el proyecto Preview, crear y migrar/auth-configurarlo antes de habilitar la IA. Los flujos de email/Google y las RPC de cuota deben estar operativos allí.

4. Guardar en entorno Preview y **volver a desplegar esa rama** en Cloudflare Pages. No basta con refrescar la página: las variables están vinculadas al deployment.
5. Abrir `https://feat-viaja-guided-planner-v2.viaja.pages.dev/api/status`. Sin JWT, el estado correcto con backend configurado es `reason: "authentication_required"`. Después de iniciar sesión con una cuenta de prueba, el planificador debe mostrar «Generar itinerario con IA» con fechas completas.
6. Crear Roma con historia 3/3, gastronomía 3/3, naturaleza 3/3 y vida nocturna 0/3. Comprobar manualmente el itinerario, no suponer que la salida del modelo cumple solo porque el payload y los prompts tienen los valores correctos.

**No publicar claves API ni JWT en issues, chats, capturas de pantalla o commit.** Mantener las claves de Gemini con límites de uso y facturación apropiados.

## Cambio UX asociado

El planificador ahora distingue explícitamente: falta de fechas, sesión no autenticada, error transitorio de conexión y backend IA no configurado. Solo muestra la opción de reintentar en casos en que podría funcionar sin cambiar la configuración.
