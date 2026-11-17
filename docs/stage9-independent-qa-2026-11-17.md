# Viaja — Etapa 9 · QA técnico independiente

Fecha: 17/11/2026 · Base auditada: `main` (`0b10ad4eb04aced5e358101fe8476c31e46636a1`)

## Veredicto

- **Funcionalidad técnica comprobada:** APROBADA en las pruebas ejecutadas.
- **Publicación web:** el workflow de Cloudflare de esta revisión terminó con éxito y validó HTTP/cabeceras/acceso anónimo.
- **Lanzamiento en App Store / Play Store:** **NO-GO** hasta resolver los pendientes de distribución indicados abajo.
- **Cobertura de integración autenticada con dos cuentas reales:** no comprobada por este agente. No debe confundirse con las pruebas unitarias ni con el QA humano informado por Matías.

## Pruebas ejecutadas por el agente

| Prueba | Resultado |
| --- | --- |
| `npm run test:core` | PASS; sin regresiones en itinerarios, guías, agenda, reservas, viaje compartido y borrado (contratos simulados) |
| `npx tsc --noEmit` | PASS |
| `npm run build:demo` | PASS |
| `node --experimental-strip-types tests/security-baseline.test.mts` | PASS |
| `node scripts/security-bundle-scan.mjs` | PASS; 34 assets de texto, sin patrones de claves privadas ni source maps públicos |
| `node scripts/release-readiness-report.mjs` | 11 contratos técnicos PASS; ocho bloqueos de lanzamiento |
| Supabase Security Advisors | Dos políticas RLS intencionalmente ausentes en tablas accesibles solo vía RPC; aviso de contraseñas filtradas deshabilitado |
| Supabase Performance Advisors | Dos FK sin índice de cobertura; siete índices sin uso observado (informativo, no eliminar sin medición) |
| GitHub CI para el commit de base | Cinco workflows PASS: seguridad, dependencias, UI, Cloudflare y web/Android |

## Seguridad: observaciones que necesitan decisión

1. **Media — Protección de contraseñas filtradas:** Supabase Auth informa `auth_leaked_password_protection` desactivada. Evaluar habilitarla en la configuración de Auth y comprobar registro/cambio de contraseña con cuentas de prueba.
2. **Informativa — `ai_usage` y `trip_invitations` sin políticas RLS de lectura:** los accesos están intencionadamente denegados por defecto y se emplean funciones RPC restringidas. No abrir políticas generales para silenciar la advertencia.
3. **Baja — Índices de FK:** `trip_invitations.created_by` y `trip_members.invited_by` no tienen índice específico. Medir necesidad al aumentar usuarios, antes de aplicar índices.
4. **Informativa — Rendimiento:** siete índices sin uso informado. No eliminarlos sin carga representativa y análisis de consultas.

## Bloqueos antes de distribuir Viaja 1.0

- [ ] Publicar política de privacidad revisada con responsable y contacto verificables (`public/privacy.html`).
- [ ] Habilitar la eliminación de cuenta dentro de la app; actualmente depende de flags de lanzamiento apagados.
- [ ] Publicar la solicitud de eliminación operativa desde la web; la página actual indica validación pendiente.
- [ ] Verificar el borrado de una cuenta descartable sin afectar a otro colaborador, su viaje ni los documentos ajenos. Solo con cuentas designadas explícitamente para destruir.
- [ ] Publicar un canal de soporte privado (`public/support.html`).
- [ ] Verificar el requisito de acceso equivalente en iOS cuando se ofrece Google Login.
- [ ] Configurar cuenta/certificados/perfiles de distribución Apple.
- [ ] Configurar la keystore y los secretos de subida de Google Play.

## Cobertura pendiente (no presentada como aprobada)

- Prueba de extremo a extremo autenticada **A y B**: alta, invitación, aceptación, correo mostrado, edición autorizada y denegación a terceros.
- Generación de itinerario con Gemini real bajo límites y fallos transitorios de API.
- Lectura y eliminación de PDF real de reserva, con validación de privacidad entre dos cuentas.
- Eliminación real de cuentas (destructiva; requiere cuentas descartables designadas).
- Pruebas en dispositivo físico y Safari PWA instalado, con red lenta, reconexión y almacenamiento lleno.
- Revisión legal y documental de privacidad, soporte y políticas de tienda.

## Criterio de cierre

No atribuir un `PASS` de mocks/contratos a una ejecución productiva autenticada. Para aprobar el lanzamiento deben resolverse los ocho bloqueos, ejecutar los flujos sensibles con cuentas de ensayo y conservar evidencia de resultados. La falta de acceso autónomo a cuentas reales no es un fallo de Viaja: es una limitación explícita de la auditoría.
