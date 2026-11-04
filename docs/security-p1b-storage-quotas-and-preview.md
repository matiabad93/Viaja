# Viaja P1.2 — Backend privado, cuotas reales y CI Preview

Estado: PR #40, rama security/p1b-private-upload-quotas-20261104. NO publicar el esquema nuevo antes del backend.

## Decisión técnica

Supabase Storage solo impone límites por archivo/bucket. Su propio equipo recomienda **no alterar las tablas internas de \`storage\`**: son metadatos de un servicio externo, y cambios directos pueden crear archivos huérfanos o incompatibilidades.

Viaja ahora utiliza dos capas:

1. **Base de datos**: trigger BEFORE INSERT en los registros \`reservation_files\` y \`trip_documents\` con bloqueo transaccional por usuario. Impone **50 archivos**, **100 MiB** acumulados entre las dos áreas, y **30 altas de metadatos por 24 horas** (incluso si el usuario elimina el documento después). Las políticas RLS existentes siguen controlando autorización. La función \`viaja_document_usage\` informa los límites y su consumo.
2. **Backend Cloudflare Pages Function**: \`/api/private-documents/upload?kind=reservation|trip&id=<uuid>\`. Exige origen correcto, JWT firmado y vigente, propietario de registro (via PostgREST/RLS) y, para documentos del viaje, rol owner/editor vigente; lee como máximo 10 MiB, comprueba firma y tamaño de los bytes, valida MIME/ruta opaca y solo entonces sube con una clave privada del servidor. **Los clientes no pueden insertar directamente en Storage** (dos políticas INSERT eliminadas). Nunca se pasan claves secretas ni rutas arbitrarias desde el cliente a la API privilegiada.

La suma de bytes en PostgreSQL es el tamaño **declarado al registrar**, pero para que el mismo usuario no pueda mentir, la ruta backend verifica \`bytes reales === size_bytes\` antes de subirlos. Las escrituras directas a Storage desde el navegador están revocadas. Un usuario no puede eludir ambas capas con PostgREST ni llamando directamente a Storage. El resto de acciones de firma, lectura y eliminación siguen protegidas por las políticas existentes.

## Plan de despliegue seguro (sin interrumpir reservas)

1. Confirmar tests TypeScript, Node unitarios, Playwright Chromium/WebKit y pruebas de autorizaciones.
2. Confirmar que las variables **solo del servidor** \`SUPABASE_URL\`, \`SUPABASE_PUBLISHABLE_KEY\` y \`SUPABASE_SECRET_KEY\` están definidas para el ambiente **production** de Cloudflare Pages. El servidor usa secret key solo en la cabecera \`apikey\`, nunca en Authorization bearer ni en el frontend. **No pegar el valor del secreto en GitHub, en el chat ni en el navegador**.
3. Merge del código web con ruta autenticada; esperar a que GitHub Actions de producción confirme \`main\` y el bundle funcione. La subida puede operar antes de aplicar la migración porque el backend usa el servidor privilegiado.
4. Aplicar \`supabase/migrations/202611040003_document_quotas_backend_upload.sql\` al proyecto \`viaja-production\` **después de desplegar el backend**. La migración contiene la eliminación final de las dos políticas directas de Storage.
5. Con una cuenta de prueba autorizada: subir un PDF pequeño, visualizarlo y borrarlo; confirmar contador; intentar el mismo JWT en Storage directamente y exigir denegación; probar usuario ajeno y viewer; verificar cupos y límite diario.
6. Consultar el panel Storage y comprobar que no quedaron archivos huérfanos; crear métricas y alertas de consumo. No activar tarifas no autorizadas.

## Preview vs producción

Los workflows obsoletos de Preview ya no solicitan \`environment: production\` ni secretos de producción. En GitHub, crear/revisar el environment **preview** e incorporar allí:
- \`VIAJA_CF_PREVIEW_API_TOKEN\` (token dedicado).
- \`VIAJA_CF_PREVIEW_ACCOUNT_ID\`.

Hasta que se configuren, sus deploys **fallarán cerrados**, sin usar el token de producción. Para separación **estricta** de permisos, desplegar Preview en otro proyecto/cuenta Cloudflare y usar un token limitado a ese entorno. Un token Pages Edit de la misma cuenta Cloudflare podría tener acceso a otros proyectos; renombrar un secreto no lo impide por sí solo.

Los workflows de esta versión ejecutan CI sin necesitar credenciales Cloudflare.

## Configuración Cloudflare adicional que requiere panel/API de la cuenta

Esta rama protege registros y datos autenticados, pero no habilita automáticamente una regla WAF. En Cloudflare se recomienda:
- Rate limit para \`/api/cities\` y \`/api/photos\`, p. ej. **30 solicitudes/60s/IP** con respuesta 429 y exclusión de tráfico identificado legítimo. Ajustar por datos reales para evitar bloquear viajeros compartiendo IP.
- Para \`/api/private-documents/upload\`, permitir solo POST autenticado y aplicar un tope adicional por IP a nivel de edge. **La cuota segura real se controla por usuario en la base**, nunca por IP solamente.
- Alertar por 401/403/413/429/5xx, almacenamiento >80 % del plan y costes inusuales.
- Revisar antes de configurar desafíos CAPTCHA que no bloqueen PWA móvil ni APIs normales.

## Rollback

- **No revertir el frontend a subida directa sin restaurar previamente las políticas originales de Storage INSERT.**
- Mantener la API de backend operativa durante cualquier rollback del esquema.
- Si falla la migración, dejar el backend activo: puede subir a Storage aunque las políticas directas todavía estén vigentes; la cuota no queda efectiva y debe señalarse como incidencia hasta corregir.
- Nunca eliminar \`storage.objects\` mediante SQL. Borrar archivos con la Storage API, primero; metadatos después.

## Validación actual

- SQL compilado y probado dentro de transacción \`BEGIN ... ROLLBACK\` contra el esquema real: ambos triggers y funciones RPC creados sin errores, políticas INSERT directas eliminadas solo dentro de la transacción, y estado posterior intacto.
- Tests de backend: JWT faltante/no válido, usuario ajeno, editor revocado, falsificación de tamaño, MIME incorrecto, ausencia de secreto, ruta esperada, subida legítima.
- E2E Chrome/Safari: importación PDF, billete con QR, vinculación de viajes, Logística, visor y eliminación.
- **Sin test de lectura/escritura real de archivo con una sesión de usuario**: es un gate obligatorio antes de considerar completada toda la protección.
