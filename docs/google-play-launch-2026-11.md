# Viaja — Google Play, paquete de lanzamiento (18/11/2026)

**Estado:** assets y ficha comercial preparados para revisión. No publicado en Google Play.

## Ficha principal (idioma español)

- App: `Viaja · Planificador de viajes`
- Copys editables: [`store/google-play/listing.es-ES.json`](../store/google-play/listing.es-ES.json). El validador comprueba los máximos de 30/80/4000 caracteres.
- Categoría sugerida: *Viajes y guías locales* (debe confirmar el propietario en Play Console).
- Soporte: `viaja.app.soporte@gmail.com`
- Web: `https://viaja.pages.dev/`
- Política: `https://viaja.pages.dev/privacy.html`
- Eliminación de cuenta: `https://viaja.pages.dev/delete-account.html`
- Página de contacto: `https://viaja.pages.dev/support.html`
- Ícono Google Play: `public/icon-512.png` (512×512).
- Gráfico promocional: `store/google-play/feature-graphic.png` (1024×500), fuente editable SVG contigua.

## Validación reproducible

```bash
node scripts/play-store-listing-check.mjs
# Añadir --require-screenshots antes de enviar la ficha a revisión.
```

## Imágenes pendientes: capturas reales (NO generarlas como mockups)

Guardar al menos dos capturas de la **app Android real** en `store/google-play/screenshots/phone/` antes de enviar la ficha. Idealmente cuatro, en el mismo idioma y tamaño de pantalla, con datos de demostración no personales:

1. **Planificar:** asistente guiado con destinos y preferencias.
2. **Agenda:** itinerario de varios días con actividades.
3. **Explorar:** guías y viajes destacados, sin contenido privado.
4. **Reservas y equipo:** mostrar documentos ficticios y colaboración ficticia, sin correos reales ni PDFs privados.

Google Play admite JPEG/PNG de entre 320 y 3840 píxeles, con relación de lados máxima 2:1 (vertical 9:16 funciona). Se requieren dos capturas como mínimo para la ficha; revisar también los criterios de formatos de promoción.

## Preparación de envío — sin pasos innecesarios para el usuario

**Automatizado/reutilizable:**

- Android `com.matiabad.viaja`, `targetSdkVersion=36` (exigencia de nuevas apps desde el 31/08/2026).
- GitHub Actions `Viaja - Google Play signed AAB (manual)` genera el AAB de distribución solo después de validaciones web y QA.
- Firma mediante credenciales efímeras en entorno GitHub `android-release`; ni claves ni contraseñas están versionadas.
- Metadatos, ícono, gráfico promocional, páginas públicas y chequeo de longitudes.

**Requiere intervención del propietario / revisión humana:**

1. Abrir/validar cuenta **Google Play Console**, registrar paquete `com.matiabad.viaja` y completar identidad/verificación exigida.
2. Generar y custodiar una **upload key** estable y cargar los cuatro secretos del entorno `android-release` (ver `docs/store-launch-checklist-2026-11-04.md`). No enviar claves al chat.
3. Ejecutar el workflow manual, descargar `Viaja-Play-Release-AAB`, subirlo primero a **Internal testing** y verificar funcionamiento de la app real en teléfono Android.
4. Capturar pantallas reales y completar clasificaciones, contenido de app, **Data safety**, SDKs, país/edad y declaración de cuenta eliminable en Play Console. No afirmar un tratamiento de datos que no esté confirmado.
5. Realizar prueba cerrada cuando Play Console lo exija (para determinadas cuentas personales nuevas: **12 testers inscritos durante 14 días continuos**). Las pruebas de familiares/QA externos no sustituyen automáticamente esta pista de Play Console.
6. Verificar en producción, con **dos cuentas de prueba específicamente identificadas**, la eliminación real y el mantenimiento de permisos en viajes compartidos. No usar cuentas reales ni hacer limpieza masiva.
7. Revisión de nombre/marca, permisos de fotos, licencias y textos legales con el titular antes de publicar. Confirmar que el correo de soporte recibe mensajes.

**No incluida:** publicación automática a producción o envío a revisión; es una decisión final del propietario en la consola.

## Fuentes de reglas (Google)

- Ficha y límites: https://support.google.com/googleplay/android-developer/answer/9859152
- Imágenes: https://support.google.com/googleplay/android-developer/answer/9866151
- Datos y eliminación: https://support.google.com/googleplay/android-developer/answer/10144311
- API objetivo: https://developer.android.com/google/play/requirements/target-sdk
- Pista de prueba cerrada: https://support.google.com/googleplay/android-developer/answer/14151465
