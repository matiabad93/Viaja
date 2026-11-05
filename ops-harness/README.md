# Viaja Ops Harness — tareas + WhatsApp + audio

**Implementación en rama** `feat/ops-harness-whatsapp-20261105`. No se modifican ni desplegan Viaja de producción, su base de datos, Supabase Auth o sus secretos.

## Qué hace exactamente

1. Sigue tareas verificables: Issues abiertos/cerrados, PRs abiertos/fusionados y tareas completadas mediante una ejecución manual de GitHub Actions.
2. Guarda estados en una **Cloudflare D1 independiente**: pendiente, en curso, bloqueada, terminada y cancelada.
3. Muestra un **panel de administración privado** (restringido por token distinto del token de ingesta).
4. **Solo cuando una tarea pasa a completada**, envía una **plantilla de WhatsApp aprobada** que identifica la tarea y enlaza su evidencia.
5. Respondés `AUDIO` a ese WhatsApp; durante la sesión autorizada (ventana de 24 horas desde tu mensaje) el webhook genera una **nota de voz OGG/Opus** con IA y te la manda por WhatsApp. El audio dice que es generado por IA y no imita la voz de ninguna persona.

**Limitación del canal:** no es posible asumir que un audio libre puede iniciar un chat WhatsApp automáticamente a cualquier hora. Meta exige plantillas preaprobadas fuera de la ventana de 24h. Por eso el patrón «notificación → respondé AUDIO → nota de voz» es más confiable que prometer un audio proactivo imposible. Dentro de 24h, sí puede llegar la nota de voz. Una alternativa futura sería añadir un enlace temporal a un MP3 en el aviso.

**No es un webhook nativo de ChatGPT.** Este harness registra eventos GitHub y eventos explícitamente integrados. El chat de ChatGPT no emite automáticamente un evento por cada actividad; para seguir tareas de otro origen hay que crear un adaptador o registrar una tarea manual.

## Meta: enlace oficial verificado (5 de noviembre de 2026)

El enlace directo a `developers.facebook.com/apps/` puede mostrar una página rota o exigir autenticación dependiendo del navegador y la sesión. Usar como entrada estable el **centro oficial de WhatsApp Business**:

https://whatsappbusiness.com/es-la/developers/developer-hub/

Seleccionar **Empezar** (o **Iniciar sesión** si ya existe una aplicación). Esta es la página de entrada verificada; luego Meta solicita acceso a la cuenta y creación/selección de una aplicación y portafolio empresarial. No solicitar contraseñas ni códigos de 2FA en conversaciones. Un agente solo puede continuar configurando Meta y Cloudflare cuando el titular se autentique de forma segura y permita esas operaciones.

Para una prueba inicial puede usarse el número de prueba que ofrece Meta, con el destinatario habilitado por el titular. Eso no confirma todavía el envío a escala ni la aprobación de plantillas de producción.

## Preparar WhatsApp Business Cloud API

1. Crear/usar una **Meta Developer App** con WhatsApp Business Platform y registrar un **número emisor** permitido. Verificar la cuenta y la suscripción/aceptación expresa del número receptor.
2. Obtener en Meta `Phone Number ID` y un access token de sistema con permisos de WhatsApp Cloud API para **ese número**. No usar WhatsApp Web ni credenciales personales.
3. Crear y pedir aprobación de una plantilla en español **Utility** llamada `viaja_task_completed`, con **dos variables en el cuerpo y en este orden**:

    `Viaja Ops: terminamos "{{1}}". Ver detalles: {{2}}. Respondé AUDIO a este chat para recibir el resumen hablado.`

   La categoría y aprobación dependen de Meta. Si la plantilla aprobada tiene otro nombre o idioma, actualizar `WA_TEMPLATE_NAME` / `WA_TEMPLATE_LANG`.
4. En el apartado de Webhooks de Meta usar:
   - Callback URL: `https://<tu-subdominio>.workers.dev/webhook/whatsapp`
   - Verify token: exactamente el valor configurado en el secret `WA_VERIFY_TOKEN`
   - Suscripción: `messages` para recibir respuestas de tu número.
   - El servidor verifica además la firma HMAC `x-hub-signature-256` usando `META_APP_SECRET`.
5. El receptor `WA_RECIPIENT` debe ser tu WhatsApp personal, en formato internacional E.164 (ej. sin `+` en el secreto). **No publiques tu teléfono ni lo compartas por chat.**

## Preparar Cloudflare Worker + D1 aislados

Desde la raíz del repositorio, una vez que la rama se integre de forma revisada:

```bash
cd ops-harness
npm install
npx wrangler login
npx wrangler d1 create viaja-ops
```

Copiar el identificador D1 que devuelve Cloudflare y reemplazar **solo** `REPLACE_WITH_NEW_OPS_D1_DATABASE_ID` en `ops-harness/wrangler.toml`. Luego:

```bash
npx wrangler d1 execute viaja-ops --remote --file=./schema.sql
```

Crear tokens **distintos y aleatorios** para admin y GitHub (ejemplo local: `openssl rand -hex 32`), sin enviarlos por chat. Guardar como secretos de Worker:

```bash
npx wrangler secret put OPS_ADMIN_TOKEN
npx wrangler secret put OPS_INGEST_TOKEN
npx wrangler secret put WA_ACCESS_TOKEN
npx wrangler secret put WA_PHONE_NUMBER_ID
npx wrangler secret put WA_RECIPIENT
npx wrangler secret put WA_VERIFY_TOKEN
npx wrangler secret put META_APP_SECRET
npx wrangler secret put OPENAI_API_KEY
```

Finalmente `npx wrangler deploy`. La página inicial del Worker será tu panel. `/health` responde salud general sin revelar secretos. Usá `OPS_ADMIN_TOKEN` para entrar: no se almacena en localStorage y no se comparte con GitHub Actions. No compartas capturas donde aparezca este token.

La configuración arranca con `OPS_SEND_ENABLED = "false"` para evitar mensajes accidentales. **Solo tras completar el opt-in, aprobación de plantilla y pruebas**, cambiarlo a `"true"` en `wrangler.toml` y volver a desplegar.

### Configurar GitHub Actions

En [Secrets and variables → Actions](https://github.com/matiabad93/Viaja/settings/secrets/actions) añadir exactamente dos **Repository secrets**:

| Secret en GitHub | Valor |
|---|---|
| `OPS_INGEST_URL` | URL pública HTTPS de este Worker, ej. `https://viaja-ops-harness.<subdominio>.workers.dev` |
| `OPS_INGEST_TOKEN` | El MISMO secreto creado en el Worker para `OPS_INGEST_TOKEN`, distinto del token de admin |

**No guardar WhatsApp, OpenAI ni D1 tokens en GitHub.** Esos viven solo en Cloudflare. No activar la integración sobre una rama sin validar.

Al fusionar el PR de la infraestructura en `main`, el workflow `Viaja Ops - WhatsApp task completion bridge` registra las tareas de GitHub desde el usuario autorizado `matiabad93`:
- Issue abierto → pendiente; cerrado → completado (aviso).
- PR abierto → en curso; fusionado → completado (aviso dice «integrado», no «desplegado»).
- `workflow_dispatch` → permite registrar un resultado real con título, resumen y enlace validado.

El workflow `Viaja Ops - Import historical task backlog (silent)` es **manual** y llena el panel con Issues y PR existentes **sin enviar retroactivamente mensajes**. Ejecutarlo solo una vez al iniciar, o conscientemente cuando se quiera resincronizar.

## Pruebas y aceptación

```bash
cd ops-harness
npm run check
npm test
```

Prueba inicial: enviar un evento de estado `todo` a `POST /api/events` con bearer `OPS_INGEST_TOKEN`; comprobar que aparece en el panel. Cambiarlo a `completed` tras aprobar la plantilla y activar notificaciones. Debe llegar **un solo aviso**. Responder `AUDIO` desde el número autorizado; el webhook debe mandar un OGG/Opus de una narración real. Meta debe mostrar el mensaje enviado; un ID de API **no significa que WhatsApp haya confirmado entrega o lectura**.

Las pruebas del repositorio NO realizan llamadas pagadas a WhatsApp/OpenAI.

## Política y privacidad

- Evitar enviar datos de clientes, contraseñas o fragmentos de código privado por WhatsApp o al proveedor TTS. El resumen solo incluye metadatos de tarea que tu flujo autorice.
- La voz es sintética y se revela explícitamente. El modelo de Speech API `gpt-4o-mini-tts` tiene fecha de retirada anunciada para **6 de enero de 2027**; planificar migración a una solución de voz soportada, o sustituir el sintetizador sin cambiar el webhook.
- Meta/WhatsApp y TTS pueden tener costes adicionales a ChatGPT Plus; revisar las tarifas vigentes y limitar mensajes.
- La protección del panel es **bearer token**, apropiada para un MVP personal; para múltiples usuarios usar SSO/OIDC con RBAC y auditoría.
- Se requiere verificación real del despliegue de Cloudflare antes de afirmar que una tarea está publicada. Fusionar un PR no equivale a producción desplegada.
- Los IDs de WhatsApp entrantes se deduplican en D1. El webhook exige firma HMAC; los actores del GitHub Action están restringidos y el Worker rechaza URLs no permitidas.
- Esta rama NO modifica la aplicación cliente de Viaja. El Worker es un servicio completamente separado.

Fuentes de referencia:
- WhatsApp plantillas y ventana de conversación: https://www.twilio.com/docs/api/errors/63016
- Meta Cloud API audio por ID: https://www.postman.com/meta/whatsapp-business-platform/request/goznbg0/send-audio-message-by-id
- OpenAI API Speech: https://developers.openai.com/api/docs/guides/text-to-speech
