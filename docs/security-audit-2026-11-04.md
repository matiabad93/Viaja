> **Archivo histórico consolidado el 4 de noviembre de 2026.** Los estados de "pendiente" y "solo en la rama" de este informe corresponden al momento de su redacción original. Desde entonces los PR #29, #30, #40 y #41 fueron integrados en main. En Supabase viaja-production constan aplicadas las migraciones de cuotas y RPC invoker (verificadas mediante list_migrations y pg_proc el 4/11/2026). Sigue pendiente validar una subida real autenticada de PDF, los secretos aislados de Preview, las reglas WAF de Cloudflare y la protección de contraseñas comprometidas (advertencia del Security Advisor). Este archivo conserva hallazgos y evidencias; no certifica un pentest ni que todos los controles estén activos en Cloudflare.\n\n# Auditoría de seguridad de Viaja — 4 de noviembre de 2026

**Alcance:** código de rama main (commit 0f42339ed0cf3b2be26462ef02cf3d741c245843), aplicaciones web/PWA y Android, Cloudflare Pages Functions, Supabase proyecto viaja-production, workflows de GitHub y grafo de dependencias npm. Evaluación basada en OWASP ASVS 5.0.0, prácticas de Supabase y revisión manual de arquitectura.

**Veredicto:** controles de autorización y aislamiento correctos en puntos esenciales; **NO se considera que Viaja cumpla una certificación completa de seguridad ni que haya superado un pentest externo**. Hay vulnerabilidades confirmadas en paquetes instalados, configuraciones pendientes y riesgos de abuso. Una alerta de un paquete instalado no demuestra por sí misma que su CVE sea alcanzable en el runtime desplegado.

**Reglas de alcance responsable:** lectura de código y metadatos de configuración, asesores de Supabase, comprobación no destructiva de RLS ya realizada mediante transacción revertida, y npm audit en un runner aislado. NO se ejecutaron ataques de fuerza bruta, exfiltración de archivos, fuzzing intensivo, explotación de RCE, carga maliciosa de PDF ni acciones destructivas sobre producción. No se inspeccionaron datos privados de terceros. Todas las correcciones siguientes están solo en una rama de desarrollo, sin merge ni despliegue.

## Actualización de mitigación P0 — 4 de noviembre de 2026

**Estado de rama de seguridad, NO producción:** las alertas críticas/altas del escaneo inicial se mitigaron al actualizar `next` 16.3.4 → 16.4.1, `eslint-config-next` a 16.4.1, `zod` 3.25.76 → 4.6.6, `sharp` 0.35.4 → 0.35.5 y transitorios de pnpm `browserslist` → 4.29.5 y `source-map-js` → 1.2.2. Se regeneraron tanto `package-lock.json` como `pnpm-lock.yaml`; el workflow temporal con `contents:write` ya fue eliminado.

**Evidencia:** GitHub Actions de regeneración https://github.com/matiabad93/Viaja/actions/runs/41835772557 (TypeScript, build, test de seguridad, npm audit y pnpm audit). `npm audit --omit=dev`: 0 vulnerabilidades; `pnpm audit --prod --audit-level high`: 0 altas/críticas; quedan 4 moderadas y 3 bajas. Nuevo gate permanente en `.github/workflows/security-audit.yml` para ambos gestores. Antes de integrar al main, verificar todos los jobs posteriores a la actualización.

El diagnóstico SEC-01 de la tabla a continuación describe el **estado encontrado originalmente en producción**; ya no se aplica al árbol de dependencias actualizado en la rama, pero seguirá aplicándose a `main` hasta su merge y redeploy.

## Hallazgos confirmados y plan

| ID | Estado / riesgo | Prioridad | Evidencia | Medida recomendada |
|---|---|---|---|---|
| SEC-01 | Paquetes npm con **1 alerta crítica y 2 altas** en dependencias instaladas: next 16.3.4, sharp 0.35.4, zod 3.25.76 | P0 — actualización prioritaria | GitHub Actions: npm audit runtime, run 41827870743 | Actualizar Next >=16.4.1, sharp >=0.35.5, Zod >=4.6.6 o eliminar dependencias si no están usadas. Regenerar **ambos** lockfiles y retestar. Evaluar reachable bundle/runtime antes de calificar impacto en Cloudflare; el sitio se construye principalmente con Vite, no con un servidor Next |
| SEC-02 | Workflows de Preview leían **entorno/tokens de producción** | Alta | .github/workflows/viaja-documents-preview.yml y viaja-logistics-preview.yml | Preparado: usar ambiente preview y token de Cloudflare de menor privilegio, exclusivo de preview. Crear los secrets VIAJA_CF_PREVIEW_API_TOKEN y VIAJA_CF_PREVIEW_ACCOUNT_ID en el ambiente preview; revisar deploy controls |
| SEC-03 | No existía archivo versionado de cabeceras de seguridad en estáticos; respuestas API no normalizadas | Media-alta | public/_headers ausente en main y functions/api/[[path]].ts | Preparado: no-referrer, nosniff, anti-framing, HSTS, Permissions-Policy y CSP parcial; API headers centrales. Completar CSP con script-src e inventario de dominios después de probar el script inline de tema |
| SEC-04 | No existe **cuota acumulada de documentos ni de cantidad de cargas por usuario**; solo 10 MB por archivo | Alta (abuso/cuotas) | Bucket reservation-pdfs y trip-documents; sus tablas y políticas; código de subida directo a Storage | Añadir rate-limit atómico y límites por usuario, viaje y día, contra Storage real, no basándose solo en size_bytes controlado por cliente. Exigir límite de bytes reales/reciclado de archivos huérfanos y alertas de presupuesto |
| SEC-05 | Tokens de sesión (incluyendo refresh token) guardados en localStorage | Media-alta, dependiente de XSS | lib/supabase-client.ts, clave viaja-auth-session-v1 | Plan de migración a auth en cookies HttpOnly/Secure/SameSite vía backend BFF y OAuth PKCE; CSP estricta mientras tanto. No cambiar storage sin plan de migración para evitar cerrar sesiones masivamente |
| SEC-06 | Prototipo antiguo público bajo /demo/ comparte origen con app autenticada. Uso de innerHTML/onclick en su JS heredado | Media, exposición potencial | public/demo/app.js, public/demo/index.html | Eliminar del despliegue real, aislar en otro origen o auditar y sanitizar todas las interpolaciones. No se demostró un vector remoto directo de XSS; el riesgo crece si se llega a almacenar entrada maliciosa en ese prototipo |
| SEC-07 | Falta análisis antimalware/sanitización profunda de PDF. El servidor controla MIME, extensión y primeros bytes, pero eso no equivale a analizar estructura/adjuntos activos | Media | lib/reservation-library.ts; server/reservation-extraction.ts; Supabase Storage | Analizador robusto, cuarentena y verificación antivirus fuera del navegador; escaneo asíncrono. Mostrar PDF de un origen aislado; no asumir que %PDF- garantiza inocuidad |
| SEC-08 | APIs públicas /api/cities y /api/photos consultan servicios externos con términos arbitrarios; hay límites por consulta y caché, pero no control por IP ni cuota de tráfico configurable en código | Media (disponibilidad) | server/destinations.ts y server/tourism-photos.ts | Habilitar reglas Cloudflare WAF/rate-limiting con excepciones para uso legítimo, cuotas de egress y cache key normalizada; monitorizar fallos de proveedor y consumo |
| SEC-09 | Protección de contraseñas filtradas deshabilitada en Supabase | Media | get_advisors Security: auth_leaked_password_protection WARN | Habilitar detección de contraseñas comprometidas en Supabase Auth; añadir MFA opcional, CAPTCHA adaptativo y revisar políticas de recovery |
| SEC-10 | Restricciones de seguridad móvil mejorables: configuración Cordova access origin="*" y FileProvider external-path="." | Media, condicionado a uso real de plugins | mobile/android/app/src/main/res/xml/config.xml y file_paths.xml | Inventariar plugins y dominios necesarios, permitir solo orígenes conocidos y rutas de archivos estrechas. Confirmar que no haya puentes JS a funciones de dispositivo innecesarias |
| SEC-11 | Existía antiguo workflow de reparación de lockfile con permiso repository contents:write y credentials persistentes en checkout | Media supply-chain | .github/workflows/cloudflare-npm-lock-repair.yml | Preparado: retiro del workflow obsoleto. Minimizar secretos y permisos por job |
| SEC-12 | Protección de main/secret scanning y configuración real de permisos de ambientes no se pudieron confirmar desde este conector | Pendiente verificación | API de rulesets devolvió vacío; API de branch protection devolvió 403; endpoints de alertas no disponibles | En GitHub Settings exigir PR + al menos 1 review + status checks obligatorios y protección de producción; revisar secret scanning y bloquear push directo, exigir aprobación para environment production |
| SEC-13 | Disponibilidad/operación: no quedó verificado un plan de backups restaurables, alarmas de almacenamiento/egress, rotación periódica de tokens ni respuesta a incidentes | Pendiente | Infraestructura disponible no expone esas configuraciones por este conector | Backups y pruebas de recuperación, presupuesto Cloudflare/Supabase/Gemini, logging estructurado sin documentos/tokens, alertas de fallos 401/403/429/5xx, playbook de revocación |

| SEC-14 | Protección de datos personales y terceros aún sin documentación verificable: los PDF pueden contener nombres, localizadores, códigos de embarque, horarios y ubicaciones; Gemini procesa el PDF solo tras consentimiento UI, pero no se comprobó una política pública de privacidad y retención | Alta para comercialización en UE | Interfaz Reservas y endpoint server/reservation-extraction.ts; ausencia de política de privacidad en los archivos públicos revisados | Definir aviso de privacidad y finalidad, base jurídica, plazos y borrado efectivo, exportación y ejercicio de derechos, DPA/región de Supabase, condiciones de retención del proveedor Gemini y transferencias internacionales; auditoría de accesos a billetes y códigos QR; no afirmar cumplimiento GDPR sin asesoría jurídica |

## Controles favorables confirmados

- RLS habilitado en tablas públicas consultadas: trips, trip_members, community_trips, reservation_files, trip_documents, profiles, favorites, guides. Las políticas de viajes requieren propietario o miembro; la biblioteca Reserva exige propietario; las publicaciones usan un snapshot explícitamente filtrado.
- Los buckets reservation-pdfs y trip-documents son privados. File size limit 10 MiB. Storage RLS valida miembro/propietario según el caso y no hay permiso de sobreescritura.
- Backend de IA verifica identidad real con Supabase Auth, bloquea usuarios anónimos cuando aplica, verifica propiedad del documento, exige consentimiento explícito y cuota atómica diaria de análisis. No utiliza claves de servicio en el cliente.
- El endpoint de subida valida PDF en frontend, y el análisis en backend exige cabecera %PDF- antes de enviarlo a Gemini. La reserva conserva archivo privado y la extracción es propuesta pendiente de confirmación humana.
- URLs firmadas de documentos con expiración de 120 segundos.
- Android: allowBackup=false, usesCleartextTraffic=false y allowMixedContent=false.
- Service worker no cachea rutas /api/.
- Funciones SECURITY DEFINER sensibles usan search_path vacío, controles de auth.uid y revocación del EXECUTE a roles públicos donde corresponde. Los avisos RLS enabled/no policy de ai_usage y trip_invitations son **aislamiento intencional**: usuarios normales no tienen grants directos y se usan RPC protegidas. No hay vistas públicas antiguas sin security_invoker.

## Vulnerabilidades npm: impacto y versiones

Resultado reproducible: GitHub Actions run https://github.com/matiabad93/Viaja/actions/runs/41827870743

- **Next.js 16.3.4** afectado por alerta crítica para versiones 16.0.0–16.4.0, parche >=16.4.1. La alerta de RCE requiere una ruta vulnerable de ejecución Next App Router/Cache Components (y/o entorno de imagen vulnerable); **no se estableció que esa ruta exista en el despliegue Vite+Cloudflare**.
- **sharp 0.35.4** alto, parche >=0.35.5 en librería nativa usada potencialmente por herramientas de procesado de imágenes; exposición remota depende de uso real del runtime.
- **Zod 3.25.76** alto, parche >=4.6.6 para problema de consumo ilimitado en validación de ciertos arrays; verificar si alguna API acepta arrays controlados por atacante y si Zod está bundled.
- Auditoría del runtime **Android/Capacitor (npm mobile)**: **0 críticas, 0 altas, 0 moderadas** en este escaneo. No implica que no haya problemas nativos/Android fuera de npm.
- Referencias: https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2026-148/ y https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 y https://developers.cloudflare.com/pages/configuration/headers/

## Correcciones preparadas sin tocar producción

Rama: security/viaja-hardening-audit-20261104

1. Header hardening en Cloudflare estáticos y todas las APIs; no-store para HTML principal.
2. Dependabot semanal para npm root y mobile y GitHub Actions.
3. Nuevo workflow de seguridad con análisis de dependencias real **bloqueante** para alertas altas/críticas y análisis independiente de Android; testea TypeScript, build, políticas, PDF y auth.
4. Escaneo del contenido web compilado en busca de patrones de claves privadas y mapas fuente públicos. Un resultado limpio no sustituye GitHub Secret Scanning.
5. Workflows antiguos de Preview ya no usarían credenciales/env production; requieren crear el environment preview y dos secrets delimitados.
6. Retiro del workflow antiguo con permisos amplios.

La job code-security pasó en el primer ciclo. La job dependency-audit **está correctamente roja** porque hay paquetes afectados; no debe tratarse como fallo accidental ni saltarse el gate.

## Pruebas pendientes antes de cerrar la auditoría

- Confirmar con dos cuentas reales y PDFs sin datos sensibles que RLS/Storage niega lectura, firma y eliminación entre propietarios.
- Comprobar headers reales una vez desplegado el hardening y evaluar CSP estricta contra fuentes usadas por mapas, fotos, login y PWA.
- Validar ausencia de paquetes Next/sharp/Zod afectados en el artefacto realmente desplegado; si se usan, parchear, regenerar npm/pnpm lockfiles y testear Safari/Android.
- Fuzzing controlado de validaciones y autorizaciones en un entorno **staging aislado**, nunca en producción con datos reales.
- Validar firma/rotación de secretos, controles Auth y gestión de respaldos en Cloudflare/Supabase/GitHub Settings.
- Revisar cobertura por especialistas cuando Viaja gestione reservas de usuarios reales de forma comercial.

## Orden de ejecución propuesto

**P0:** cerrar alertas de dependencias y verificar alcance real. **P1:** aprobar hardening de headers y CI, configurar preview token; agregar topes reales de almacenamiento y WAF. **P2:** sesiones HttpOnly/PKCE, retirar prototipo antiguo, análisis profundo PDF, endurecimiento móvil, backups/observabilidad.

**Importante:** la auditoría identifica riesgos y verifica controles concretos, pero ninguna revisión estática permite garantizar ausencia total de vulnerabilidades.
