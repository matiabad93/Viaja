# Viaja 2.0 — Planificador guiado (Preview)

**Rama:** `feat/viaja-guided-planner-v2-20261104`  
**PR de revisión:** https://github.com/matiabad93/Viaja/pull/44  
**Producción:** `main`, sin cambios desde este PR.

## Objetivo UX

Reducir la complejidad inicial para personas de distintas edades. La vista **Planificar** ofrece un recorrido de cuatro pasos, mientras que «Opciones avanzadas» preserva el formulario completo.

1. Destino y fechas o duración (se puede iniciar sin fechas).
2. Intereses en barras de 0 a 3 (cuatro visibles; cuatro más opcionales).
3. Tipo de grupo, cantidad de personas, estilo de presupuesto y franjas horarias de cada día opcionales.
4. Resumen + nota libre opcional + acción de generar con IA (cuando hay sesión y fechas válidas) o crear viaje con guía/agenda.

**Ejemplo de prueba**: Roma, Italia; 3 días; pareja; presupuesto intermedio; Historia 3/3, Gastronomía 3/3, Naturaleza 3/3, Vida nocturna 0/3.

## Comportamiento real y límites

- Las preferencias se guardan en `trip.preferences` en cada viaje. Gemini y OpenAI reciben dichas prioridades como una estructura validada, no solo como texto libre.
- Cualquiera puede guardar un viaje sin IA ni fechas. Si el destino coincide con una de las seis guías editoriales publicadas (Roma, Madrid, Barcelona, París, Lisboa, Colmar), se cargan actividades sugeridas y editables. **Esas actividades son editoriales, no recomendaciones personalizadas al 100 %**, y no aseguran horarios, disponibilidad ni precios.
- Cuando no hay una guía editorial para ese destino, se crea una agenda editable sin actividades.
- La generación con IA necesita inicio de sesión y fechas exactas. Las horas por día se envían solo si la persona las configuró.
- No se compran tickets, no se reservan hoteles ni se modifican datos de producción en los tests.
- Todas las características existentes siguen accesibles: viajes, modo avanzado, calendario, reservas PDF, mapas, presupuestos y colaboración.

## Validación

- `node --experimental-strip-types tests/guided-planner-v2.test.mts`.
- `npm run test:core`, `npx tsc --noEmit`, `npm run build:demo`.
- `node scripts/guided-planner-browser-smoke.mjs` tras servir el build en `http://127.0.0.1:4173` y configurar Playwright según el workflow.
- El smoke browser verifica teléfono 390×844, teléfono en modo oscuro y escritorio 1440×900; carga Roma, confirma sliders, ajusta la primera jornada a las 12:00, crea y persiste itinerario con tres días, recupera el formulario avanzado y comprueba que no haya scroll horizontal.
- La suite de CI anterior se ejecuta también para detectar regresiones de navegación y funciones existentes.
- En GitHub Actions, los workflows de Preview generan capturas como artefacto privado `Viaja-Guided-Planner-UX-QA`.

## Publicar una Preview real de Cloudflare

La rama está preparada para publicar, pero requiere **credenciales dedicadas a Preview**; no reutilizar los secretos de producción.

1. En Cloudflare: crear un API Token con permiso mínimo para **Cloudflare Pages Edit** sobre la cuenta del proyecto `viaja`, y copiar el Account ID de dicha cuenta. Evitar permisos de DNS, D1, claves de IA o acceso a proyectos ajenos.
2. En GitHub → repositorio Viaja → Settings → Environments → `preview`, configurar las dos **Environment secrets**:
   - `VIAJA_CF_PREVIEW_API_TOKEN` (token Cloudflare Pages con alcance mínimo).
   - `VIAJA_CF_PREVIEW_ACCOUNT_ID`.
3. GitHub Actions → `Viaja 2.0 — Guided Planner Preview` → Run workflow en la rama indicada. El build, las pruebas y el deploy se ejecutan de nuevo.
4. Leer la **URL real** que Wrangler imprima en `Deploy feature branch to Cloudflare Pages Preview only`. No inferir una URL a partir del nombre de la rama.
5. Verificar en móvil y escritorio los flujos con sesión real antes de dar el Preview como aprobado. Al publicar la rama, confirmar que Cloudflare Pages usa secretos y variables de **entorno Preview**, independientes de producción.

**Bloqueo detectado 2026-11-04:** en el run https://github.com/matiabad93/Viaja/actions/runs/41934889665 las pruebas y el build pasaron, pero la publicación quedó bloqueada por ausencia de `VIAJA_CF_PREVIEW_API_TOKEN` y/o `VIAJA_CF_PREVIEW_ACCOUNT_ID`. No existe URL nueva confirmada de Preview.

## Aprobación antes de fusionar

- [ ] URL real de Preview y test móvil manual con personas 25–35 y 60+.
- [ ] Prueba con cuenta real que usa IA para Roma: comprobar que intereses 3/3 y 0/3 influyen en el resultado, sin afirmar que la IA garantiza todas las actividades.
- [ ] Revisar accesibilidad con VoiceOver/TalkBack y textos ampliados.
- [ ] Revisión de QA de invitaciones, reservas, viajes y cambios de tema desde el nuevo flujo.
- [ ] Merge a `main` solo tras la aprobación.
