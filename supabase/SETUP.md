# Supabase production setup — Viaja

This is step 1 of Viaja v1.0.0, **not a production release**. The public `main` deployment keeps working until auth, sync, AI quotas, maps and security tests are complete.

## 1. Configure Viaja's project in Supabase
1. Dashboard → select `viaja-production`.
2. Authentication → URL Configuration:
   - Site URL: `https://viaja.pages.dev`
   - Allowed Redirect URLs: `https://viaja.pages.dev/**` (use exact production paths when flows are finalized).
3. Authentication → Providers → Email: enable email/password and keep email confirmation enabled. For a public app, configure a production SMTP service; Supabase's default mailer is restricted.
4. SQL Editor → New Query → paste the contents of [`supabase/migrations/202610290001_initial_viaja.sql`](./migrations/202610290001_initial_viaja.sql), review and run in the intended project once. This is a **new SQL migration**, not a statement that it has already been applied.
5. Table Editor → verify `profiles`, `trips`, `favorites`, `guides`, `ai_usage` exist. Before use, test RLS with two distinct accounts: account A cannot read/write/delete trips belonging to B; unauthenticated requests cannot read trips; only published guides are visible publicly. Automated RLS tests remain to be added.

## 2. Connection values
Dashboard → Project Settings → API Keys / Connect. Record:
- Project URL, such as `https://PROJECT_REF.supabase.co`
- Publishable key (starts `sb_publishable_`) or legacy anon key, if applicable

These are **public client configuration**, but you should still configure them in Cloudflare Pages (Production and Preview environments), rather than hardcoding the project into the source:
- `VITE_SUPABASE_URL` — Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable key

**NEVER** paste/share/commit `service_role`, `sb_secret_`, database password, OpenAI API keys or user passwords. Values for the browser are deliberately public and safe only in combination with restrictive RLS policies.

## 3. Before connecting the frontend
- The existing UI uses `localStorage` and is not yet wired to Supabase Auth or Postgres.
- Keep `main` as the working live release. The migration alone does **not** implement signup, login, syncing, maps or AI.
- Work on a branch and test sign-up, email confirmation, log-in, recovery, logout, cross-device sync and migration of existing local trips before switching public traffic.
- `server/planner.ts` must **not** be exposed merely by setting `OPENAI_API_KEY`; use valid user tokens, abuse protection, enforced quotas, per-request cost accounting and a capped spend budget. Keep API keys server-side.
- Supabase account quotas, email deliverability and billing are separate from Cloudflare. Review quotas before promoting to 1.0.0.

Official docs:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/redirect-urls

## Preview de autenticación para pruebas (29-10-2026)

La rama de desarrollo está publicada por Cloudflare Pages en:

- **Preview estable de rama:** https://feat-v1-production-release-p.viaja.pages.dev/
- **Despliegue verificado:** GitHub Checks → Cloudflare Pages, commit `979ee0e`.

**Antes de registrar usuarios de prueba:** en Supabase → Authentication → URL Configuration → Redirect URLs, añadir exactamente:

```text
https://feat-v1-production-release-p.viaja.pages.dev/**
```

Mantener la Site URL en `https://viaja.pages.dev`. No usar una regla global para todos los subdominios de `pages.dev`. Esta URL de preview es pública: registrar solo cuentas de prueba propias hasta validar seguridad y el envío de correo. Para registro/recuperación, usar el correo recibido y regresar a la preview, no a la producción demo.

**Checklist manual de staging (sin suponer éxito):**
1. Crear cuenta de prueba; recibir y abrir el correo de confirmación; verificar inicio de sesión.
2. Crear un viaje, marcar una actividad, añadir un gasto; cerrar sesión y entrar desde otro navegador o equipo.
3. Confirmar que el viaje y sus cambios persisten; verificar que sin sesión no se ven datos privados.
4. Recuperar contraseña y comprobar que vuelve a la preview correcta.
5. Confirmar que dos usuarios distintos no comparten viajes y que no pueden modificar el viaje del otro; registrar los resultados.
6. Verificar importación de datos locales de forma voluntaria y sin pérdidas.

**Limitaciones actuales:** estos flujos de navegador aún no han sido ejecutados de punta a punta. `ai_usage` es privado de servidor. `/api/plan` sigue deshabilitado; no publicar como 1.0.0 todavía.


## Viaja 1.1 — Entrega C: documentos privados (04-11-2026)

La migración aditiva es [202611040001_trip_documents_private_storage.sql](./migrations/202611040001_trip_documents_private_storage.sql). Debe aplicarse solo al proyecto Supabase viaja-production; no modificar el proyecto separado de Tupã Travel. No cambia viajes ni publicaciones existentes.

**Arquitectura:** bucket privado trip-documents (PDF/JPG/PNG/WEBP/ICS, 10 MiB por archivo). Objeto en ruta opaca tripId/documentId/document.ext. Nombre original y relación con alojamiento/transporte en public.trip_documents, con RLS; nunca en public.trips.document, el catálogo comunitario o localStorage.

**Permisos:** dueño y editor pueden listar/subir/consultar/eliminar; lector solo listar/consultar. Invitado sin sesión y terceros no tienen acceso. Se aplican políticas independientes tanto a public.trip_documents como a storage.objects; no hay políticas de UPDATE ni overwrites. La metadata se registra antes de subir para que Storage pueda comprobar permisos. En caso de error de upload se intenta eliminar el registro; el borrado correcto elimina bytes primero y metadata después.

**Enlaces temporales:** Storage emite enlaces firmados de 120 segundos al comprobar JWT y RLS. Un enlace firmado es una credencial bearer: quien lo reciba puede descargar hasta su expiración. Revocar acceso impide obtener nuevos enlaces, pero no invalida los ya emitidos; eliminar el objeto invalida su acceso. No registrar esos enlaces en el documento del viaje ni enviarlos a proveedores de IA. Documentación: https://supabase.com/docs/guides/storage/serving/downloads

**Límites y cuotas:** el cliente comprueba la extensión y firma real del archivo, además de un máximo de 10 MiB. El bucket verifica MIME y tamaño. Las cuotas, posibles cargos por almacenamiento y ancho de banda dependen del plan de Supabase.

**Checklist de aceptación con cuentas reales (además de pruebas automatizadas con mock):**
1. Dueño/editor suben un PDF y una imagen; reaparecen después de cerrar y abrir sesión.
2. Lector puede ver/descargar pero no subir/eliminar.
3. Tercero ajeno y anónimo no pueden consultar, firmar, subir o eliminar.
4. Previsualizaciones en Safari iPhone, Chrome Android y escritorio; ICS se ofrece como descarga.
5. Borrar el comprobante y confirmar que la Storage API no lo devuelve; borrar el viaje y verificar limpieza.
6. Confirmar que una publicación de Explorar destinos no incluye localizadores, URLs firmadas ni documentos.

La lectura automática con IA es una Entrega D distinta y solo podrá ejecutarse tras consentimiento explícito.
