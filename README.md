# Viaja

Código de la aplicación de viajes existente, exportado desde la versión `2ffc19d` y preparado para web independiente y Android. Se conservan la interfaz React, guías, viajes, itinerario diario, calendario, checkboxes persistentes, fotografías, gastos y enlaces externos a mapas.

## Instalar y ejecutar

Requiere Node.js 22.21 o superior y npm. No se incluyen `node_modules`, claves ni datos de usuarios.

```sh
npm ci --ignore-scripts
npm run dev:demo
npm run build:demo
npm run test:core
npx tsc --noEmit
```

La compilación independiente genera `web-dist/`. Se conserva el backend original de la aplicación. Las herramientas internas de publicación del hosting anterior se excluyen: no son necesarias para esta compilación. El frontend independiente importa los mismos componentes; no es una reconstrucción visual.

## Cloudflare Pages (plan Free)

1. En Cloudflare: Workers & Pages → Create application → Pages → Connect to Git.
2. Autorizar únicamente `matiabad93/Viaja` y seleccionar la rama `main`.
3. Preset: None. Comando: `npm ci --ignore-scripts && npm run build:demo`. Directorio de salida: `web-dist`.
4. Node: 22.21 o superior. Establecer `NODE_VERSION=22` y `SKIP_DEPENDENCY_INSTALL=true` si el sistema intenta instalar con otro gestor.
5. Nombre sugerido: `viaja-matiabad` (la disponibilidad se comprueba al crearlo).
6. Las funciones de `functions/api/` se publican con el proyecto. No se necesitan secretos para la demo. Los siguientes pushes despliegan automáticamente.

El acceso a Cloudflare todavía debe autorizarlo el propietario. Este repositorio no acredita una URL publicada.

## Android

Proyecto Capacitor 8.6.0 en `mobile/`, aplicación `com.matiabad.viaja`, nombre e icono Viaja.

```sh
VIAJA_NATIVE=true npm run build:demo
cd mobile
npm ci --ignore-scripts
npx cap sync android
cd android
./gradlew assembleDebug
```

Requiere JDK 21, Android SDK 36 y licencias del SDK aceptadas. APK resultante: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. El workflow de GitHub Actions entrega el artefacto `Viaja-Android` con `Viaja.apk` firmado con clave de depuración. Cada compilación limpia puede usar otra clave; para sustituir una versión previa puede hacer falta desinstalarla (exportar los viajes antes). No es una firma de distribución comercial.

La interfaz y las guías se incluyen en el APK. Sin backend configurado, el buscador usa su proveedor geográfico existente, las galerías conocidas usan el catálogo incluido y la IA permanece desactivada. Para una compilación conectada, definir `VIAJA_API_BASE=https://<dominio-publico>` al compilar y permitir explícitamente el origen nativo en el backend. No introducir claves en esa variable: es una URL pública.

## iPhone / PWA

Abrir la URL HTTPS de Pages en Safari → Compartir → Añadir a pantalla de inicio. Nombre: Viaja. Se incluyen manifest, iconos 192/512, apple-touch-icon y service worker. El modo offline ofrece una lectura de los viajes previamente guardados; nuevas búsquedas y APIs necesitan internet. La instalación en un iPhone físico requiere validación manual.

## Datos y seguridad

Los viajes y gastos se guardan en el almacenamiento de cada navegador o instalación. No existe sincronización multiusuario y los datos no se transfieren automáticamente al cambiar de dominio. Exportar los viajes desde la aplicación antes de cambiar de entorno. No se exportan viajes personales al repositorio.

La demo externa no confía en cabeceras de identidad de ChatGPT y no expone generación IA de pago. `server/planner.ts` conserva la integración original, pero la ruta pública la deshabilita hasta implementar autenticación y controles de consumo independientes. No basta con configurar una API key para abrirla al público.

## Limitaciones reales

- Calendario y checkboxes usan las mismas actividades persistidas.
- La pestaña de mapas ofrece enlaces externos; no calcula rutas interactivas.
- Las guías son contenido editorial de demostración. No garantizan horarios, precios ni disponibilidad futura.
- Las fotografías externas y sus licencias/créditos se conservan en el catálogo y `public/photo-credits.html`.
- La IA, Gmail y Civitatis no se presentan como integraciones verificadas en la demo externa.

## Costes

Seleccionar únicamente Cloudflare Free. El uso queda sujeto a sus cuotas, y a los términos de los proveedores externos. OpenAI puede generar costes cuando se habilite; está desactivado en esta demo. Revisar específicamente la licencia de uso comercial de Open-Meteo antes de una explotación comercial: la gratuidad del hosting no convierte todas las APIs en gratuitas para cualquier uso. No se han contratado planes ni dominios.
