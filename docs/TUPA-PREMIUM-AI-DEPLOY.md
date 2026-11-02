# Tupã Travel Premium v1 — aplicación con IA aislada

Este documento corresponde a la rama `tupa-travel-v1`. **No desplegar esta rama en la producción de Viaja ni reutilizar las claves de Viaja**. La portada, navegación, planificación manual, recorridos de ejemplo, detalle, calendario, mapas, gastos, PDF y perfil ya están en la aplicación. La IA Gemini y las cuentas están integradas a nivel de código, pero **no funcionan hasta configurar una infraestructura independiente**.

## 1. Base de datos y autenticación independientes

1. Crear un **proyecto nuevo** de Supabase para Tupã Travel, en la organización elegida y verificando cualquier coste antes de aprobarlo.
2. Ejecutar **solo en ese proyecto** `supabase/tupa/setup.sql`. El archivo crea `trips`, `ai_usage`, políticas RLS por propietario y las funciones `tupa_reserve_ai_request` / `tupa_finalize_ai_request`. Nunca ejecutarlo contra `viaja-production`.
3. En Supabase Authentication habilitar email/password (y confirmación de email) y, si se desea, Google OAuth. Añadir URL HTTPS final y callback `<URL>/` a URL Configuration / redirect URLs.
4. Obtener Project URL y publishable key desde el proyecto **Tupã**. La publishable key está permitida en el navegador; la secret key queda solamente en el servidor. Verificar que la tabla `trips` es accesible por la Data API (se incluye `GRANT` explícito) y que RLS impide que un usuario lea los viajes de otro.

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
