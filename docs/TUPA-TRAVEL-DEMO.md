# Tupã Travel — propuesta de prueba (white-label)

> Versión comercial **no oficial** creada como demostración tecnológica, sin integración con el sistema de ventas, precios o cuentas de la agencia. El uso del logo aportado para esta demo no implica un contrato ni autorización comercial permanente.

## Identidad y enlaces

- Nombre de la experiencia: Tupã Travel · Demo de planificación.
- Logo: archivo proporcionado por el propietario del proyecto Viaja, convertido a recurso SVG con una miniatura WebP integrada. Se conserva el diseño original.
- Web proporcionada: https://tupatravel.com.ar/
- Instagram proporcionado: https://www.instagram.com/tupatravel/
- Esquema visual: azul petróleo, dorado y celeste.

La web y el perfil de Instagram no pudieron inspeccionarse directamente al preparar la demo. No se incorporaron supuestos paquetes, precios ni testimonios.

## Separación de Viaja

- Rama exclusiva: `demo/tupa-travel`.
- Fuente de cambios: `feat/v1-production-release-plan` en el commit `50280e3`.
- Hosting: despliegue Preview de Cloudflare Pages asociado a esa rama, sin cambiar `main` ni `feat/v1-production-release-plan`.
- Autenticación/Supabase del producto: deshabilitados deliberadamente en el Vite config de esta rama.
- Viajes de prueba: guardados en `localStorage` mediante `tupa-demo-trips-v1`, distinto del almacenamiento de Viaja.
- Itinerario preestablecido: ejemplo editable de Roma, sin cotizaciones ni reservas.
- La API de ciudades y fotografías sigue utilizando servicios de consulta pública; no se guardan datos de usuarios en la base de Viaja.
- La IA no está habilitada en la demo aislada: para activarla se requiere nuevo proyecto de autenticación y cuotas, y secretos configurados para el entorno de agencia. Evitar usar secretos de producción o eliminar RLS.

## Recorrido sugerido con la agencia

1. Abrir la portada con su marca y enlaces oficiales.
2. Entrar en **Mis viajes** y explorar el ejemplo de Roma (mapa, itinerario, calendario y gastos).
3. Crear un viaje nuevo **sin IA** e incorporar destinos, fechas y actividades.
4. Editar o eliminar una actividad, revisar gastos y exportar itinerario.
5. Identificar qué pantallas usaría realmente un agente de viajes y cuáles compartiría con sus clientes.

## Limitaciones transparentes

- No existe motor de reservas, cotizador, catálogo de paquetes Tupa ni CRM.
- No se envían ni almacenan datos de pruebas en Supabase de Viaja.
- No hay cuentas compartidas ni sincronización multidispositivo.
- Las recomendaciones automáticas con IA requerirían una instancia aislada y una revisión de coste/seguridad.
- La prueba con una URL de Cloudflare de la misma aplicación no equivale a hosting independiente a nivel de cuenta. En una venta real sería necesario crear una instancia y dominio de la agencia, separar bases de datos y habilitar los servicios autorizados.

## Siguiente paso hacia producto comercial

- Acordar alcance de prueba y autorización de uso comercial del logo/marca.
- Crear proyecto Supabase independiente y asignar entorno Cloudflare propio.
- Configurar autenticación de usuarios de la agencia, panel administrativo y catálogo de productos real.
- Aislar cuotas de IA y permitir configuración segura de Gemini, con fuentes verificables.
- Definir cliente objetivo, modelo SaaS/white-label, propiedad de los datos, mantenimiento, soporte, privacidad y eliminación de cuentas.

## Pruebas y despliegue

GitHub Actions: `.github/workflows/tupa-demo-checks.yml`.

Para trabajar localmente:
```bash
git clone https://github.com/matiabad93/Viaja.git
cd Viaja
git switch demo/tupa-travel
npm ci --ignore-scripts
npm run dev:demo
```

Luego abrir http://localhost:5173/ y editar componentes en Cursor. El CSS y los textos se actualizan con Vite HMR.
