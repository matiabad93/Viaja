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

## Preview de Cloudflare (Git integrado)

Cloudflare Pages ya está conectado al repositorio GitHub `matiabad93/Viaja` y despliega automáticamente la rama `feat/viaja-guided-planner-v2-20261104` en un **deployment de Preview** cada vez que se actualiza la rama.

1. Entrar al panel de Cloudflare → Workers & Pages → `viaja` → **Deployments**.
2. En **All deployments**, elegir la fila **Preview** de la rama `feat/viaja-guided-planner-v2-20261104` con el commit más reciente; abrir su URL de despliegue. No asumir que la URL de un commit antiguo representa la versión nueva.
3. Para validar el código, revisar GitHub Actions → `Viaja 2.0 — Guided Planner Preview QA`: el workflow hace `tsc`, pruebas, build y tests de navegador. **No despliega** y no necesita API Token ni Account ID.
4. Probar de nuevo el flujo y verificar preferencias + IA con una cuenta de prueba antes de aprobar la fusión.

**Nota histórica:** el antiguo pipeline de Wrangler fallaba porque faltaban `VIAJA_CF_PREVIEW_API_TOKEN` y `VIAJA_CF_PREVIEW_ACCOUNT_ID`. Ese despliegue duplicado fue eliminado del workflow, ya que Cloudflare realiza directamente la publicación mediante Git.

## Correcciones de UX de la segunda revisión

- Pestaña activa del menú en modo oscuro más sobria: sin gran bloque verde ni raya beige.
- Quitado del planificador público el botón y el preset «Probar ejemplo: Roma».
- Agregados intereses opcionales **Deportes**, **Fútbol**, **Eventos y espectáculos** y **Actividades familiares**, todos valorables de 0 a 3.
- Viajeros coherentes: **Solo = 1 fijo**, **Pareja = 2 fijos**, **Familia = 3–12** y **Amigos = 2–12** editables; validación también en backend.
- Las preferencias, presupuesto orientativo, disponibilidad horaria por día y texto opcional se envían a los generadores IA como datos estructurados. Los intereses 3/3 se priorizan y los 0/3 se evitan salvo petición explícita; no se inventan partidos, eventos ni reservas.
- Los viajes antiguos con 8 intereses conservan sus elecciones y reciben valores por defecto para las nuevas categorías.

## Aprobación antes de fusionar

- [ ] URL real de Preview y test móvil manual con personas 25–35 y 60+.
- [ ] Prueba con cuenta real que usa IA para Roma: comprobar que intereses 3/3 y 0/3 influyen en el resultado, sin afirmar que la IA garantiza todas las actividades.
- [ ] Revisar accesibilidad con VoiceOver/TalkBack y textos ampliados.
- [ ] Revisión de QA de invitaciones, reservas, viajes y cambios de tema desde el nuevo flujo.
- [ ] Merge a `main` solo tras la aprobación.
