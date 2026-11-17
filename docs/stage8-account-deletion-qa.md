# Viaja · Etapa 8 — Eliminación de cuenta (QA antes de tiendas)

**Estado:** implementación en rama de QA; no marcar como lista para tiendas hasta completar las verificaciones manuales.

## Alcance

- El usuario inicia la solicitud desde **Mi cuenta → Eliminar mi cuenta** o la página pública `/delete-account.html`.
- La API comprueba origen, JWT firmado por Supabase, correo de la sesión, inicio de sesión reciente (15 minutos) y frase exacta de confirmación. El navegador jamás elige un ID de cuenta que borrar.
- El servidor recoge las rutas privadas de los documentos subidos por la cuenta y de los viajes que la cuenta organiza, incluso si un colaborador subió documentos a esos viajes. También recoge los PDFs de reservas propios.
- Primero elimina los archivos con la API de Storage, después las referencias `trip_documents` cuyo `uploaded_by` es el usuario y, por último, el usuario Auth. Las demás relaciones están definidas con cascada o `SET NULL`.
- El borrado opcional de datos locales se realiza en el **dispositivo que confirma**. No es posible borrar automáticamente el almacenamiento local de otros dispositivos.

## Pruebas automatizadas que no modifican datos reales

```sh
npm ci
npm run test:core
npx tsc --noEmit
npm run build:demo
node scripts/release-readiness-report.mjs
```

El test `tests/account-deletion.test.mts` simula las llamadas HTTP y comprueba:

1. Orígenes ajenos, falta de token y confirmación incorrecta: se rechazan antes de contactar con Supabase.
2. Inicio de sesión antiguo o correo diferente: no se envían solicitudes de borrado.
3. Resultados potencialmente truncados por paginación: el proceso se detiene sin borrar.
4. Error de Storage: no se eliminan registros ni el usuario Auth.
5. Flujo exitoso: se eliminan únicamente rutas registradas de los dos buckets privados; la baja de Auth se solicita **última**.

## Prueba de integración pendiente — solo cuentas descartables

**No ejecutar sobre la cuenta personal de Matías ni sobre viajes reales.** Usar dos cuentas nuevas A y B, creadas exclusivamente para QA, y datos ficticios sin información personal. Acordar antes con quien hace la prueba que ambas cuentas se podrán eliminar.

Se incluye `scripts/account-deletion-live-e2e.mjs`, un test destructivo **exclusivamente manual** y nunca incluido en los workflows habituales. No puede ejecutarse sin un consentimiento literal y una URL de preview de Cloudflare (rechaza la URL de producción). Admite únicamente correos con prefijo `viaja-e2e-delete-` y cuentas creadas hace menos de 7 días; comprueba que ambas estén vacías antes de crear dos viajes y dos PDFs sintéticos. Elimina **solo A**, verifica que B conserve el viaje y el PDF y limpia las pruebas de B al terminar.

Para ejecutarlo desde un entorno privado con acceso al preview, configurar `VIAJA_E2E_PUBLISHABLE_KEY`, `VIAJA_E2E_DELETE_USER_A_EMAIL`, `VIAJA_E2E_DELETE_USER_A_PASSWORD`, `VIAJA_E2E_DELETE_USER_B_EMAIL` y `VIAJA_E2E_DELETE_USER_B_PASSWORD`. También se exigen `VIAJA_E2E_DELETE_PREVIEW_URL`, `VIAJA_E2E_DELETE_CONFIRM_EMAIL` (idéntico al de A) y `VIAJA_E2E_DELETE_ALLOW=DELETE_QA_ACCOUNT`. **Nunca compartir contraseñas en un PR ni en el chat.** No se agrega un workflow automático de borrado: GitHub solo permite ejecutar workflows manuales definidos en la rama por defecto, mientras que esta prueba necesita correr sobre el preview **antes** de integrar el PR.

1. A crea un viaje privado y una reserva PDF de prueba; B se une como colaborador y adjunta un documento de prueba al viaje de A.
2. B crea otro viaje privado, al cual invita a A. A sube un documento de prueba al viaje de B.
3. Como A, intentar eliminar con frase equivocada, sin token y con sesión de más de 15 minutos. Confirmar que las pruebas son rechazadas y que todo sigue visible.
4. Como A, volver a iniciar sesión, escribir `ELIMINAR MI CUENTA` y confirmar. Comprobar que desaparece A de Auth y que no puede volver a iniciar sesión.
5. Desde B, verificar que su propio viaje sigue existiendo y que el documento que había subido A desapareció; el viaje organizado por A y el documento que B había subido allí dejan de existir.
6. Comprobar que los objetos correspondientes desaparecieron de `trip-documents` y `reservation-pdfs`. Verificar que **ningún** otro archivo privado de B fue eliminado.
7. Repetir con fallo simulado del proveedor entre Storage y Auth para verificar recuperación o circuito asistido de soporte. No usar ni alterar archivos de usuarios reales.
8. Probar página web pública y modal en Safari de iPhone, Safari/Chrome de escritorio, Chrome Android y versiones nativas antes de publicar en tiendas; comprobar teclado, foco, contraste, lector de pantalla y controles táctiles.

## Límites y riesgos que bloquean el lanzamiento de la función

- **No es una operación transaccional entre Storage, PostgREST y Auth.** Un error a mitad del proceso puede dejar una eliminación parcial. Hay que ensayar recuperación y ofrecer un canal de soporte real.
- Los archivos huérfanos que no tengan fila en `trip_documents` o `reservation_files` no son detectados por esta primera versión. Si existieran, podrían impedir la baja en Auth. Revisar manejo de huérfanos y nuevas subidas concurrentes antes del merge.
- El borrado de respaldos del proveedor y los plazos de conservación deben declararse con precisión en una política legal verificada; no prometer eliminación instantánea de todas las copias.
- Confirmar el funcionamiento del `SUPABASE_SECRET_KEY` configurado en Cloudflare para Storage, PostgREST y Auth Admin sin exponerlo al cliente.
- Para Google Play / App Store, siguen faltando responsable legal verificable, correo de soporte, política de privacidad pública, revisión de inicio de sesión Apple/equivalente y credenciales de firma.

**Criterio de aceptación:** todas las verificaciones anteriores satisfactorias, sin pérdida de datos ajenos, política/soporte aprobados y revisión de seguridad. Hasta entonces, **no fusionar ni desplegar** este borrado irreversible.
