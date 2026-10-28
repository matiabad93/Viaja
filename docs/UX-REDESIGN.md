# Viaja — auditoría y rediseño (28/10/2026)
## Auditoría previa
Una ruta React con estado de pestañas. Explorar y administración comparten Guides; planificación, resultado y listado comparten page.tsx. API /api/status y POST /api/plan en Worker, búsqueda OpenAI y citas reales. No existe modelo ni integración de reservas. Sitio owner-private: la administración local está disponible sólo dentro de ese perímetro.
Persistencia: viaja-ai-trips-v1, viaja-ai-current, viaja-guides-v1, viaja-favorites-v1 y migración visual en localStorage. No hay sincronización remota.
Problemas: resultado acoplado al formulario; gastos y reportes alargan el detalle; sin agenda editable; tarjetas sin estado, búsqueda ni filtros; guardado trunca a 200; reglas CSS repetidas; selector diario de guías sin controles de teclado completos; formularios de administración extensos; falta feedback global fuera del planificador.
## Arquitectura de información
Explorar → guía → crear viaje. Mis viajes → Resumen / Itinerario / Gastos / Información. Planificar mantiene API y búsqueda. Administración mantiene CRUD editorial, independiente del viajero.
Reservas: no se añaden confirmaciones ficticias. Resumen muestra explícitamente la ausencia de integración.
## Diseño
Verde bosque, papel cálido y acento terracota; encabezados editoriales serif, interfaz sans. Controles de al menos 44px, foco visible, movimiento reducido. Pestañas del viaje y selector diario horizontales desplazables intencionalmente. En móvil, navegación principal compacta inferior. Fotografía sólo cuando corresponde al destino, sin imágenes de otra ciudad.
## Datos
Campos nuevos opcionales itinerary y expenses enriquecidos; originales parts y sources intactos. Migración no destructiva al editar/guardar. Importes en centavos y conversión manual declarada a EUR. Sin cotizaciones automáticas inventadas. Respaldo JSON con todos los campos. No se borra ni trunca el historial de viajes.

## Implementación entregada
Componentes nuevos: TripsDashboard, TripDetail, ExpensePanel. Modelo y lógica compartida en lib/travel.ts. Datos originales y claves de almacenamiento conservados. Rediseño del sistema visual en globals.css; adaptación de Guides y page.tsx. Prompt de IA refinado para encabezados diarios consistentes sin cambiar el contrato de respuesta.
- Mis viajes: búsqueda, filtros de estado, presupuesto/gastado, duplicación sin gastos.
- Detalle: Resumen / Itinerario / Gastos / Información; agenda por un día con controles anterior/siguiente, editar, mover entre días, reordenar y eliminar actividades.
- Gastos: CRUD, filtros, categorías, porcentajes, moneda original y conversión manual registrada.
- Móvil: navegación inferior, agenda horizontal, formularios adaptados y controles táctiles.
- Administración: CRUD previo conservado, búsqueda de biblioteca, publicación/borradores, imágenes y contenido.
- Accesibilidad: etiquetas, foco, enlace de salto, botones semánticos, movimiento reducido; no se afirma certificación WCAG.
## Pruebas
TypeScript y suite de lógica: estados, fechas, cálculos en centavos, migración de días sin mutar originales, preservación de informes y duplicación.
Pruebas reales en navegador de escritorio: crear viaje desde guía, cambiar días, gasto 12,50 EUR contra 700 EUR (saldo 687,50), recargar y recuperar gasto, duplicar sin gastos.
Vista móvil en iframe de 390px: portada, navegación inferior, crear desde guía, agenda, editar duración de actividad, administración. Detectados y corregidos: crypto.randomUUID no disponible en preview HTTP; barra inferior atrapada por backdrop-filter del header.
No se realizó una nueva consulta facturable al proveedor de IA en esta revisión. Se conserva la conexión existente.
## Límites y evolución
Persistencia local; no sincronización de usuarios. Administración protegida por sitio owner-private; antes de compartir con viajeros se necesitan roles y autorización de servidor. Sin reservas ni mapas integrados ni tasas automáticas de divisas. Fotografías locales disponibles sólo para Barcelona, Roma y Lisboa; los otros destinos usan una portada gráfica honesta. Los informes antiguos sin encabezados reconocibles conservan su texto completo, pero requieren organizar su agenda manualmente. No hay certificación de accesibilidad ni pruebas sobre dispositivos físicos.
Próximas prioridades: almacenamiento con cuentas y roles, importación/restauración de respaldos, respuesta IA estructurada validada y catálogo fotográfico con licencias.
