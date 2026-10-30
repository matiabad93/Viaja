# Viaja 1.0.0 — Producto real (NO PUBLICAR HASTA SUPERAR LOS CRITERIOS)
Fecha de preparación: 2026-10-29. Estado: **propuesta técnica, no implementada**.

## Propósito
Convertir el sitio actual de Cloudflare Pages en la primera versión real de Viaja sin reconstruir su interfaz React ni eliminar guías, calendario, checklists, gastos, fotos y PWA. **No** basta cambiar el nombre de la versión o quitar la palabra «demo». La rama main debe permanecer estable y no debe aceptar rutas públicas que consuman IA sin autenticación y límites.

## Auditoría del código actual (comprobado en main)
- `app/page.tsx`: gestión de planes en `localStorage` (`viaja-ai-trips-v1`); no hay sesión de usuario.
- `components/travel-hub.tsx`: guías y favoritos en `localStorage`, con editor local.
- `functions/api/[[path]].ts`: `/api/status` fuerza `ready:false` y `/api/plan` responde 503.
- `server/planner.ts`: contiene lógica de investigación OpenAI Responses + búsqueda web, pero usa cabeceras propias del hosting anterior para identificar propietario. **Nunca confiar en cabeceras suministradas por el cliente.**
- `db/schema.ts`: vacío; `db/index.ts` es una referencia a D1 sin tablas productivas.
- `components/trip-detail.tsx`: mapa basado en enlaces externos, sin visualización/cartografía ni cálculo de ruta integrado.
- `package.json`: versión 0.1.0. Android disponible como APK de depuración, no publicación comercial.
- No hay evidencia de que Gmail ni Civitatis estén conectados de forma productiva.

## Propuesta técnica mínima y coherente
- **Frontend**: React/Vite actual, responsive/PWA, sin reconstrucción.
- **Alojamiento/API**: Cloudflare Pages + Pages Functions en el dominio `https://viaja.pages.dev`.
- **Auth y datos**: Supabase Auth (alta, login, verificación de email, recuperación de contraseña, sesión persistente), PostgreSQL con Row Level Security (RLS). Es una propuesta a confirmar; requiere crear el proyecto Supabase y configurarlo. Las claves de servicio nunca se publican.
- **Datos**: `trips` (Plan JSON con esquema/versionado), `guides` (editorial), `favorites`, `ai_usage` (solo servidor) y `profiles`. RLS impide que una cuenta lea o edite viajes ajenos; rol admin es comprobado desde servidor/base de datos.
- **API IA**: Cloudflare Function comprueba un token de usuario verificable, valida payload, impone cuotas por usuario y globales, limita concurrencia/abuso y llama OpenAI Responses + web_search con `OPENAI_API_KEY` cifrada. Conservar generación estructurada de itinerarios y las fuentes, con manejo de fallos y costes.
- **Mapas y rutas**: mapa integrado (MapLibre GL u otra librería compatible) y proveedor de rutas autorizado para uso público, con geocodificación confiable, modos a pie/coche/transporte público solo cuando el proveedor realmente los soporte, atribuciones y límites de cuota. No presentar enlaces o estimaciones como rutas propias.
- **Integraciones**: Civitatis con enlaces/atribución y, si procede, programa/credenciales oficiales antes de afirmar disponibilidad o compra; Gmail mediante OAuth con consentimiento individual, scopes mínimos, tokens protegidos, revocación y política de privacidad. No acceder a Gmail sin autorización individual.
- **Android**: recompilar Capacitor con `VIAJA_API_BASE=https://viaja.pages.dev`, sesión compatible con navegador nativo, CORS/redirects correctos; APK debug no equivale a versión comercial.
- **Costes**: Hosting free no garantiza IA o APIs gratuitas. Definir límite de gasto, cuota por usuario, monitorización y respuestas explícitas al exceder límites antes de habilitar IA pública.

## Historias y criterios de aceptación de v1 (obligatorios)
### V1-01 Registro, sesiones y seguridad
- Crear cuenta, confirmar email, iniciar/cerrar sesión y restablecer contraseña; estados de carga/error y accesibilidad móvil.
- No fiarse de `oai-authenticated-user-*`, email ni `user_id` provistos por el navegador. Comprobar identidad con token criptográficamente validado en el backend.
- Tests: invitado no accede a datos privados; usuario A jamás ve/edita/borra datos de B; expiración y logout invalidan sesión.
### V1-02 Sincronización de viajes
- CRUD de viajes, gastos, calendario, checkboxes y favoritos almacenados remotamente con control de autoría.
- Mantener exportación de datos; migración explícita/segura de viajes `localStorage` a cuenta una sola vez (sin pérdidas ni duplicados).
- Prueba de sincronización entre dos navegadores y tras cerrar/reabrir.
### V1-03 IA pública protegida
- Activar `/api/plan` solo tras autenticar usuario y configurar secret en Cloudflare, con límites de peticiones, gasto, tokens, timeouts y concurrencia.
- Mantener validación de fuentes, fechas, presupuestos e itinerario; no garantizar precios/reservas sin verificar.
- Tests 401 no autenticado, 429 cuota superada, 400 validación, 503 sin configuración y éxito con proveedor simulado.
### V1-04 Cartografía
- Mapa real embebido en detalle del viaje, puntos geocodificados y recorrido calculado por proveedor.
- Mostrar modo de transporte, atribuciones y aviso cuando no existe ruta; nunca inventar distancias o ETA.
### V1-05 Administración, guías e integraciones
- Guías publicadas persistentes; permisos reales de editor/admin; usuario normal nunca edita contenido global.
- Civitatis: solo datos/accesos habilitados realmente por contrato/API, con aviso de enlace externo cuando corresponda.
- Gmail: conectar/desconectar por usuario, consentimiento OAuth, tokens cifrados, revocación; no dejar claves o refresh tokens en el frontend ni en GitHub.
### V1-06 Web, iPhone y Android
- Pruebas E2E del flujo alta -> crear viaje -> generar IA -> añadir gasto/actividad -> consultar desde otro dispositivo.
- PWA Safari instalada, service worker sin cachear respuestas privadas ajenas y estrategia offline segura.
- APK Android build conectado a producción y smoke test en dispositivo/emulador; sin secret embebida.
- Términos, privacidad, borrado de cuenta/datos, crédito/licencias de imágenes, accesibilidad básica, errores y observabilidad.

## Orden propuesto para las ramas/PRs
1. Infraestructura Supabase + migraciones SQL/RLS + tests de aislamiento de datos.
2. Auth UX, sesión, sincronización y migración de localStorage.
3. IA protegida server-side + límites/gasto + pruebas y monitorización.
4. Mapas y rutas con proveedor autorizado, cobertura y cuotas.
5. Admin editorial y Civitatis/Gmail con consentimiento y permisos.
6. E2E, dispositivos móviles, legal/seguridad, release 1.0.0 y despliegue monitorizado.

## Variables y autorizaciones que debe configurar el propietario (NUNCA en Git)
- URL y clave pública/anon de Supabase para el cliente; clave de servicio solo donde sea estrictamente necesaria y **siempre secret de servidor**.
- `OPENAI_API_KEY` como secret en Cloudflare Pages, presupuestos y límites de API definidos.
- Proveedor de rutas/mapas con API key, cuota y atribución (si es necesario).
- Google OAuth (Gmail), consentimiento y política de privacidad; cuenta de afiliado/API oficial de Civitatis si se requiere integración más allá de enlaces.

## Regla de publicación
**No renombrar la demo a v1 ni habilitar IA sin autenticación, cuotas y pruebas.** Mantener `main` y `viaja.pages.dev` funcionando hasta cumplir checklist. Integrar PRs por etapas; desplegar primero vista previa, revisar tests y solamente entonces publicar/etiquetar `v1.0.0`. Documentar rollback y exportación de datos.
