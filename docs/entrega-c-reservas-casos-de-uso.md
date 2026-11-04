# Viaja 1.1 — Entrega C · Centro de Reservas
Estado: en desarrollo. Rama: feat/viaja-documents-private-storage-c-20261104.

## Diseño de dominio

Reservas es una biblioteca personal y privada independiente del itinerario. Una reserva es un PDF original, puede contener varios vuelos o un alojamiento y se asocia opcionalmente a un viaje. La asociación no publica ni comparte el documento con otros viajeros, ni crea gastos automáticamente. El usuario conserva su archivo PDF, incluidos los códigos QR o de embarque impresos.

## Casos de uso (CU)

| ID | Actor | Flujo y criterio de aceptación |
|---|---|---|
| CU-01 | Usuario autenticado | Importar PDF arrastrando o seleccionando, sin crear viaje ni solicitar IA. Documento persiste tras recarga |
| CU-02 | Usuario | Error descriptivo al seleccionar archivo vacío, PDF falso, no PDF o mayor de 10 MiB |
| CU-03 | Usuario | Abrir o descargar el PDF original, incluidos QR de boarding pass, mediante URL firmada de 120 segundos |
| CU-04 | Usuario | Pulsar «Extraer con IA» y aceptar que ese documento se enviará a Gemini para lectura; nunca automáticamente |
| CU-05 | Usuario | Previsualizar sugerencia con tipo, compañía, números, fechas y horarios; corregir y confirmar antes de guardar |
| CU-06 | Usuario | Vincular opcionalmente PDF a un viaje editable, cambiar vínculo, o dejar «sin viaje» |
| CU-07 | Usuario | Buscar por nombre/proveedor/destino, filtrar tipo y estado, ver estado vacío |
| CU-08 | Usuario | Editar título, tipo, campos y vinculación manualmente sin repetir la extracción |
| CU-09 | Usuario | Eliminar con confirmación: primero objeto Storage, luego registro; el viaje nunca se elimina |
| CU-10 | Seguridad | Solo propietario de reserva puede listar, abrir, firmar, editar, eliminar o extraer mediante IA |
| CU-11 | Compatibilidad | Eliminar/desvincular un viaje no elimina el PDF; nunca exponer documentos en Explorar destinos |
| CU-12 | Accesibilidad | UI responsive 320-1280px, modo oscuro, controles 44px, Safari WebKit y teclado |

## Infraestructura

- Tabla public.reservation_files: propietario, archivo, estado, metadatos revisados, vinculación opcional (FK a trips con ON DELETE SET NULL).
- Bucket privado reservation-pdfs: únicamente application/pdf, máximo 10 MiB.
- Las políticas RLS de la tabla y Storage deben comprobar propiedad; sin upsert ni actualización de objetos.
- La reserva es privada del propietario incluso cuando se asocia a un viaje colaborativo; compartir el PDF con colaboradores requeriría consentimiento y una función independiente.
- El archivo nunca se guarda en Plan, localStorage o publicaciones.

## Extracción

1. Solo al aceptar expresamente el envío de **ese PDF** a Gemini.
2. Cloudflare valida JWT mediante Supabase Auth; consulta la ficha con JWT/RLS y descarga el archivo privado mediante Storage authenticated, sin URL pública.
3. El backend verifica hasta 10 MiB, contenido PDF y cupo de 3 análisis/usuario/24 horas y 60 globales/24h mediante función SQL atómica que solo invoca el backend.
4. Modelo multimodal entrega JSON estructurado sin inventar campos, ignorando cualquier instrucción dentro del PDF. Puede sugerir vuelos, hotel y avisos de incertidumbre.
5. El usuario revisa y guarda; ninguna extracción modifica automáticamente gastos, vuelos o alojamiento del viaje.
6. PDF escaneado y QR: la extracción es orientativa y no valida la autenticidad del documento; siempre queda disponible el PDF original.
7. No enviar datos a un proveedor si el usuario no consiente, no guardar datos en logs, no generar una URL pública.
8. Si falla la cuota o la IA no está configurada, el PDF queda guardado y editable manualmente.

## Validación de release

TypeScript, build, tests de formatos y límites, acceso dueño/editor/lector y ajenos, prueba de subida y previsualización en Safari y Chrome, persistencia, filtrado y vinculación sin viaje. QA real con cuentas antes de producción.
