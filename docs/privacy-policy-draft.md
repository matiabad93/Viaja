# BORRADOR INTERNO — Política de privacidad de Viaja

**No publicar sin completar los campos pendientes y revisión jurídica.**

Última revisión técnica: 17 de noviembre de 2026.

## Responsable del tratamiento

- Proyecto: Viaja.
- Responsable legal: **PENDIENTE DE CONFIRMAR**.
- Correo privado de contacto: **PENDIENTE DE PROPORCIONAR**.
- Dirección/país del responsable y jurisdicción aplicable: **PENDIENTE DE VALIDACIÓN**.

## Datos tratados y finalidad

- **Cuenta:** correo electrónico, identificador de usuario, credenciales gestionadas por Supabase Auth; acceso social si se habilita. Para registro, acceso y seguridad.
- **Viajes:** destinos, fechas, ciudad de salida, itinerarios, preferencias, gastos y notas. Para permitir crear, editar, recuperar y compartir viajes.
- **Documentos privados:** billetes y comprobantes PDF, metadatos y, cuando el usuario lo solicita, datos extraídos. Para almacenarlos y vincularlos con viajes. Pueden contener nombres, localizadores, horarios y códigos QR.
- **Contenido publicado:** solo la información de itinerario elegida para publicar; antes de publicar el usuario debe revisar descripciones potencialmente personales.
- **Consultas a IA:** el contenido necesario de la solicitud y, con consentimiento explícito, el PDF seleccionado pueden procesarse por Gemini para generar itinerarios o proponer campos. Especificar condiciones contractuales y ubicación del procesamiento tras validación.
- **Datos locales:** borradores, viajes de invitado, preferencia visual y sesión en almacenamiento del dispositivo.

## Proveedores y transferencias

Cloudflare (alojamiento/seguridad), Supabase (cuentas y datos), Google Gemini (IA opcional) y fuentes/cartografía de terceros. **PENDIENTE**: contratos, región concreta, transferencias internacionales y enlaces a las políticas vigentes.

## Seguridad

Acceso por usuario y reglas RLS, archivos PDF en buckets privados, URL firmadas temporales, validación de tipo y tamaño, límites de frecuencia y transporte HTTPS. Nunca afirmar que una seguridad es infalible.

## Bases jurídicas y conservación

**PENDIENTE**: documentar relación contractual/consentimiento/interés legítimo según cada tratamiento y plazos reales de retención, copias de seguridad y logs.

## Derechos y eliminación

**PENDIENTE IMPLEMENTAR:** el usuario debe poder iniciar desde la app el borrado de su cuenta y datos asociados, incluidos PDF en Storage y colaboraciones, sin desproteger datos de terceros. No prometer eliminación automática hasta que el flujo exista y pase QA.

## Menores, cambios y contacto

**PENDIENTE**: edad mínima, mecanismo de contacto privado, notificación de modificaciones y fecha de entrada en vigor.

> Este documento describe la base técnica observada; no es asesoramiento jurídico ni una política final.
