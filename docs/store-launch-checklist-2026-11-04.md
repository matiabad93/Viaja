# Viaja — lanzamiento web, Google Play y App Store (4 de noviembre de 2026)

Estado de publicación:
- Web funcional: https://viaja.pages.dev (Cloudflare Pages).
- Android: proyecto Capacitor 8 en `mobile/android`, ID `com.matiabad.viaja`, API 36; existe APK debug. Preparado mecanismo de **AAB firmado manual**, NO publicado en Google Play.
- iOS: no se ha versionado un proyecto Xcode listo ni existe una IPA firmada. Preparado workflow manual para generar proyecto Capacitor iOS y validar compilación sin credenciales; NO publicado en App Store.
- Dominio: NO registrado ni conectado. La compra requiere elección del nombre, comprobación de disponibilidad, pago y acceso al panel del propietario.
- Marca y políticas: verificar disponibilidad del nombre Viaja y derechos sobre iconos, fotos y materiales.

## 1. Dominio de marca en Cloudflare

La aplicación actual está en `viaja.pages.dev`. Elegir dominio definitivo (ejemplos a comprobar, **disponibilidad no verificada**: `viajaplan.app`, `miviaja.app`, `viajapp.es`). Verificar con el registrador precio inicial y renovación; no asumir disponibilidad. Registrar a nombre del propietario, activar renovaciones y 2FA. Nunca proporcionar claves de Cloudflare por chat.

Después de adquirirlo:
1. Abrir Cloudflare → **Workers & Pages** → proyecto `viaja` → **Custom domains** → **Set up a domain**.
2. Vincular dominio raíz y `www`, configurar zona DNS/nameservers según indicaciones del panel y esperar emisión de TLS.
3. Comprobar redirección canónica (www/no-www), API HTTPS y políticas de seguridad.
4. En Supabase `viaja-production` → Authentication → URL Configuration, agregar `https://<nuevo-dominio>/**` a **Redirect URLs** y definir el Site URL definitivo si corresponde. Mantener una transición segura para usuarios actuales de pages.dev.
5. Revisar Google OAuth redirect de Supabase; las redirecciones de clientes se verifican desde el nuevo dominio.
6. Verificar `planificar`, IA, mis viajes, Reservas/PDF, enlaces compartidos e invitaciones en dominio nuevo. Los viajes guardados **solo en localStorage** de `viaja.pages.dev` no migran automáticamente a otro dominio: ofrecer exportación/importación o mantener compatibilidad.
7. Cambiar `VIAJA_API_BASE` de los nuevos builds móviles al dominio HTTPS definitivo, reconstruir y validar CORS, inicio de sesión y recuperación por correo. NO dejar un redirect OAuth nativo apuntando a WebView localhost.

No habilitar dominios antes de que el registrador confirme la titularidad. Cloudflare Pages puede continuar hospedando sin cambio de proveedor.

## 2. Android — Play Console

1. Crear cuenta Google Play Console personal u organización, completar verificación de identidad y abonar tarifa de alta. Preservar el mismo `applicationId=com.matiabad.viaja` después de la primera publicación.
2. Mantener Android API target **36** (requisito de Play desde 31/08/2026); este proyecto ya apunta a 36.
3. Generar **una única** upload key `.jks` robusta y guardarla offline de forma segura. No subirla a GitHub ni compartirla. Play App Signing gestiona la clave de distribución, tu keystore es de upload.
4. En GitHub → Settings → Environments → `android-release` → Secrets configurar:
   - `VIAJA_ANDROID_UPLOAD_KEYSTORE_B64`: contenido Base64 de la upload keystore.
   - `VIAJA_ANDROID_STORE_PASSWORD`, `VIAJA_ANDROID_KEY_ALIAS`, `VIAJA_ANDROID_KEY_PASSWORD`.
5. GitHub Actions → `Viaja - Google Play signed AAB (manual)` → Run workflow. El job crea un bundle firmado `.aab`, ejecuta `jarsigner -verify` y adjunta el artefacto temporal `Viaja-Play-Release-AAB`. No sube a Play Console, no publica ni consume claves fuera del job. VersionCode incremental por ejecución; no ejecutar múltiples veces para intentar reciclar un code anterior.
6. Completar ficha: nombre, descripciones, iconos, imágenes verídicas, país/edad, Data safety, política de privacidad URL pública, enlace para pedir eliminación de cuenta, declaraciones de permisos y de SDKs.
7. Subir primer AAB a **Internal testing**, validar login, OAuth (si disponible), IA, PDF/Reservas, enlaces externos, compartir y navegación en Android físicos. Después prueba cerrada según edad y tipo de cuenta.
8. No habilitar **Production** hasta superar acceso de producción, revisión y seguridad.

## 3. iOS — Apple Developer / TestFlight / App Store

1. Crear cuenta Apple Developer Program y pagar membresía; verificar titular y Team ID.
2. GitHub Actions → `Viaja - iOS native build validation (manual)` ejecuta `macos-26` con Xcode 26+, instala `@capacitor/ios@8.6.0`, genera proyecto SPM y compila para iOS Simulator con firma deshabilitada. Aún NO genera `.ipa` ni publica en TestFlight; su aprobación no garantiza aceptación de App Store.
3. En una Mac o pipeline de firma con Apple Developer habilitado, persistir proyecto Xcode generado, verificar `PRODUCT_BUNDLE_IDENTIFIER`, iconos AppIcon 1024×1024, pantalla de inicio, soporte iPhone/iPad y URL universales/deep links. Crear certificado, profile o firma automática con el Apple Team ID.
4. Implementar y probar la autenticación nativa y retorno seguro. Temporalmente el build nativo oculta OAuth Google/Facebook hasta contar con callback verificado; correo/contraseña mantiene el flujo. Si se reactivan proveedores externos, cumplir pauta de login equivalente de Apple 4.8.
5. Añadir **eliminación de cuenta dentro de la app** antes de enviar a revisión. Completar privacidad, soporte, accesibilidad, edad, screenshots, Demo Account de revisión sin datos reales.
6. Firmar y cargar build en App Store Connect, validar con TestFlight en iPhone real, después enviar a App Review. Evitar una app que sea únicamente un WebView sin funcionalidades propias: Apple aplica criterio 4.2 de funcionalidad mínima.

## 4. Bloqueadores comunes antes de distribuir

- [ ] Mecanismo real y seguro de **eliminación de cuenta y datos** desde app y enlace externo HTTPS, con flujo de confirmación/retención.
- [ ] Política de privacidad legal correcta (responsable, domicilio o contacto, proveedores Cloudflare/Supabase/Gemini, finalidad, período de retención, derechos RGPD, transferencias cuando apliquen). No inventar un email ni publicar una política no aprobada.
- [ ] Revisar títulos, derechos de fotos, licencia de mapas, ubicación y APIs de terceros para distribución comercial.
- [ ] Terminar la prueba de documentos con **dos cuentas reales**, del Issue #42.
- [ ] Seguridad y calidad Android/iOS en dispositivos físicos, incluidos los enlaces firmados de PDF y la recuperación por correo.
- [ ] Dominio registrado y redireccionamientos Supabase adecuados.
- [ ] Cuentas Play Console y Apple Developer con acuerdos y requisitos aceptados.
- [ ] Generar y comprobar AAB de producción firmado; generar y comprobar IPA/TestFlight firmada.
- [ ] Revisar si se usan compras de productos digitales/suscripciones en las apps y aplicar la política de pagos de cada tienda antes de activar una versión premium.

## Referencias oficiales

- Cloudflare Pages dominios: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Google Play Console: https://support.google.com/googleplay/android-developer/answer/6112435
- Google Play prueba cerrada: https://support.google.com/googleplay/android-developer/answer/14151465
- Android target API: https://developer.android.com/google/play/requirements/target-sdk
- Android firma: https://developer.android.com/studio/publish/app-signing
- Apple Developer: https://developer.apple.com/programs/
- Apple App Review 4.2/4.8/5.1: https://developer.apple.com/app-store/review/guidelines/
- Capacitor iOS: https://capacitorjs.com/docs/ios
