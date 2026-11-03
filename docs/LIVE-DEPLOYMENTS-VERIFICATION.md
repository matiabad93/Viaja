# Comprobación de URLs Cloudflare · 2026-11-03

El objetivo es que **todos los enlaces de ramas existentes** carguen la última versión de su respectivo producto, sin mezclar Viaja con Tupã Travel.

- Viaja producción: https://viaja.pages.dev/
- Viaja Preview principal: https://feat-v1-production-release-p.viaja.pages.dev/
- Viaja colaboración: https://feat-collaborative-trips-202.viaja.pages.dev/
- Viaja multidestino: https://feat-multidestination-route.viaja.pages.dev/
- Viaja fixes históricos: `fix-city-autocomplete-madrid`, `fix-map-and-budget-ux-202610`, `fix-multicity-map-location-2`, `fix-travel-photos-dense-itin`, `fix-v1-mobile-ux-madrid-guid`, `work-v1-ui-fixes-pending-rel` (todos bajo `viaja.pages.dev`).
- Tupã Travel Premium: https://tupa-travel-v1.viaja.pages.dev/
- Alias histórico actualizado a premium: https://demo-tupa-travel.viaja.pages.dev/

El script `scripts/live-deployments-smoke.mjs` confirma desde GitHub Actions (sin autenticarse) que las 10 URLs de Viaja incluyan la API de invitaciones de viajes en equipo, y que las 2 URLs de Tupã incluyan el namespace de autenticación aislado de la versión premium.

**Advertencia operativa:** que el frontend esté actualizado no garantiza que los secretos Gemini/Supabase estén habilitados en cada entorno. Al comienzo de esta verificación, Viaja producción respondía `authentication_required` (esperado para visitantes sin login), mientras que Viaja Preview y Tupã Premium respondían `configuration_incomplete`. Requiere configurar esos entornos en Cloudflare si se desea usar IA real.
