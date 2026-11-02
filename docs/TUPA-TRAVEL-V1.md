# Tupã Travel · Premium v1

Primera versión funcional de la experiencia Tupã Travel, con diseño independiente, PWA y herramienta de organización de viajes. No es el proyecto de producción de Viaja, y no utiliza su Supabase.

## Estado de la entrega

- Rama: `tupa-travel-v1`, independiente de `main`, `feat/v1-production-release-plan` y la anterior `demo/tupa-travel`.
- URL de Cloudflare Pages asociada a la rama: confirmar en el check **Cloudflare Pages** del commit antes de compartir.
- Logo: `public/tupa-premium-emblem.svg` (emblema SVG dorado/azul petróleo).
- Idioma: español.
- Diseño premium responsive, PWA instalable, navegación principal en 5 pestañas.
- Fotografías de destinos de fuentes verificables; foto Santorini atribuida a Michael Nicht (CC BY-SA 4.0) y resto con créditos en `/photo-credits.html`.

## Secciones

1. **Inicio:** hero de Santorini, accesos rápidos, ruta editorial de Alsacia y enlaces a la agencia.
2. **Planificar:** crear rutas propias con origen, destinos múltiples, fechas, ritmo, actividades y gastos.
3. **Mis viajes:** abrir, editar, exportar itinerarios y eliminar.
4. **Explorar:** guías editoriales disponibles en el código base.
5. **Mi perfil:** preferencia de nombre local, exportación JSON y explicación del almacenamiento.

Las rutas destacadas (Santorini y Alsacia) son **itinerarios orientativos editables**, no promociones, paquetes, reservas ni cotizaciones de la agencia. No se inventan precios ni disponibilidad.

## Persistencia y seguridad

- No hay conexión a Supabase de Viaja: `__VIAJA_SUPABASE_URL__` y clave pública se dejan vacías en `vite.portable.config.ts`.
- Los viajes se guardan en `localStorage` con la clave `tupa-travel-trips-v1`.
- Los borradores usan `tupa-travel-current-v1`, el nombre local `tupa-profile-name-v1`.
- **No se permiten cuentas ni generación IA** hasta configurar backend propio. No deben añadirse claves privadas al frontend.
- Fotografías/catálogo de ciudades sí utilizan endpoints públicos del backend de la misma rama.
- No hay pagos, integración comercial con agencia, inventario de productos, reservas reales ni sincronización multidispositivo.
- El HTML conserva `noindex,nofollow` hasta que la titular de la marca confirme la publicación pública y textos legales.

## Para activar funciones de cuentas e IA

1. Confirmar autorización de uso y lineamientos de marca con su titular.
2. Crear un proyecto **independiente** de Supabase, aplicar migraciones de Viaja revisadas y configurar Auth/OAuth y RLS.
3. Configurar URL y clave pública de Supabase solo para esta rama/proyecto, y secretos de Gemini en entorno Cloudflare aislado.
4. Probar cuotas, permisos, eliminación de cuenta, privacidad y límites de gasto de IA.
5. Incorporar dominio propio o proyecto Cloudflare propio para independencia comercial.
6. Validar en dispositivos Android/iPhone reales antes de distribución pública.

## Desarrollo

```bash
git clone https://github.com/matiabad93/Viaja.git
cd Viaja
git switch tupa-travel-v1
npm ci --ignore-scripts
npm run dev:demo
```

El script `dev:demo` conserva el nombre técnico por compatibilidad, pero ejecuta la aplicación premium de esta rama. Abrir `http://localhost:5173`; Vite actualiza cambios en caliente.

## QA

`.github/workflows/tupa-demo-checks.yml` (nombre histórico del archivo) ejecuta TypeScript, pruebas de branding/aislamiento, build de Cloudflare y navegación real Chromium en móvil y escritorio.
