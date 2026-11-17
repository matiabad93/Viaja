# Viaja · Etapa 8 — QA y preparación de tiendas

Estado inicial: **preparación técnica, no publicación en tiendas**. El checklist debe revisarse tras cada versión.

## Matriz de pruebas

| Plataforma | Comprobación CI | Verificación física pendiente |
| --- | --- | --- |
| iPhone Safari | WebKit (390 px), planificador/reservas, accesibilidad | iPhone real: añadir a inicio, cámara/QR/PDF, rotación, teclado, red intermitente |
| iOS nativo | Xcode Simulator unsigned, Capacitor + web empaquetada | Firma, TestFlight, inicio de sesión y biometría si se incorpora |
| Android | APK debug, emulador API 35, apertura y logcat | Android real: instalación, deep links, compartir PDF, volver/atrás, ahorro batería |
| Escritorio | Chromium 1280 px, navegación, consola, rendimiento | Windows/macOS, zoom 200%, teclado y lector de pantalla |
| Backend | Denegaciones anónimas, RLS, cuotas, PDFs privados | Pruebas con dos cuentas reales y datos de prueba sin PII |

Capturas y reportes técnicos se conservan como artefactos de GitHub Actions, no se publican con la app.

## Bloqueantes de envío

1. **Privacidad y soporte.** Validar el borrador `docs/privacy-policy-draft.md` con titular legal, dirección de contacto, bases jurídicas, plazos de conservación y ubicación de proveedores. Publicar política y soporte por URL HTTPS.
2. **Eliminación de cuenta.** Diseñar y verificar eliminación autenticada de cuenta, viajes, documentos privados de Storage y referencias de colaboración. Google Play también exige una vía web externa accesible para iniciar la solicitud de eliminación. Hoy no hay acción de eliminación de cuenta en Mi cuenta ni página web externa; no presentar la app a Apple/Google como lista.
3. **Supabase Auth.** Activar, si el plan lo permite, protección contra contraseñas filtradas; [guía oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
4. **Firma.** Configurar Android Play App Signing/keystore de subida; disponer de Apple Developer, equipo de firma y certificados. Nunca subir claves al repo.
5. **Fichas.** Capturas verdaderas de iPhone y Android, descripción, clasificación por edad, política de datos, URL de soporte, declaración de SDKs, Data Safety y App Privacy.
6. **Pruebas físicas.** Validar los flujos principales en dispositivos reales antes de TestFlight y pista interna de Google Play.
7. **Inicio de sesión iOS.** Como Viaja ofrece Google para la cuenta principal, comprobar si existe otra opción de inicio equivalente que satisfaga [App Review 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services), incluyendo privacidad de correo, minimización de datos y publicidad. Corregir antes de App Store.

## Reglas de publicación

- Los workflows de publicación a tiendas son **manuales**, no automáticos.
- QA en PR; merge a `main` solo con pruebas verdes.
- El Preview jamás debe leer secretos de Cloudflare de producción.
- Nunca incluir claves privadas ni PDFs de usuarios en artefactos.
- La versión de Android debe incrementar `versionCode` para cada AAB distribuida.
- Sin documentación legal, eliminación de cuenta y firma no se anuncia «listo para tiendas».

## Seguridad detectada (17-11-2026)

- RLS habilitado sin políticas en `ai_usage` y `trip_invitations`: comprobar que sean intencionalmente *server-only*; no añadir acceso público por corregir un aviso informativo.
- Aviso Auth: filtrado de contraseñas comprometidas desactivado.
- Dos claves foráneas sin índice de apoyo: `trip_invitations.created_by` y `trip_members.invited_by`; optimización eventual, no bloquear release sin medición.
- `trip_documents.uploaded_by` usa FK `NO ACTION`: revisar la eliminación de cuentas con documentos en viajes compartidos antes de implementar borrado total.

## Resultado automático

`node scripts/release-readiness-report.mjs` genera `artifacts/store-readiness/report.json` y `report.md`, separando controles técnicos de bloqueantes legales/manuales.
