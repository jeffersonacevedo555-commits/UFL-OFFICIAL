# Universe Family League

Aplicación de torneo de FC Mobile en español con TanStack Start, React 19 y TypeScript. Usa una estética deportiva editorial: fondo oliva oscuro, verde lima, DM Sans y Barlow Condensed. Mantén el diseño adaptable y los estados vacíos honestos.

## Arquitectura

- `src/routes/index.tsx`: sitio público, filtros por competición, tabla, equipos y calendario; diálogo de administración con autenticación y formularios.
- `src/routes/__root.tsx`: documento en español, metadatos y proveedores globales.
- `src/lib/tournament.ts`: tipos públicos, definiciones de competiciones y cálculo puro de clasificación.
- `src/styles.css`: tema Tailwind y estilos del producto.
- `netlify/functions/tournament.mts`: API GET pública y POST protegida por Identity y rol admin, validación Zod y comprobación de origen.
- `db/schema.ts`, `db/index.ts`: esquema y cliente Drizzle con adaptador nativo Netlify Database.
- `drizzle.config.ts`, `netlify/database/migrations/`: generación de migraciones para aplicación automática en el despliegue.
- `src/components/ui`: componentes accesibles Radix/shadcn; el panel utiliza Dialog.

## Reglas del producto

24 equipos en liga. Se generan 23 jornadas y 276 partidos a una vuelta. Champions: posiciones 1–12. Europa: 13–24. Copa: los 16 mejores de la temporada anterior, con cruces 1–16, 2–15, 3–14, 4–13, 5–12, 6–11, 7–10 y 8–9. Supercopa de la Liga: campeón de Liga vs subcampeón de Copa y subcampeón de Liga vs campeón de Copa; semifinales y final a doble partido. Supercopa de Europa: campeón de Champions vs campeón de Europa League, final a doble partido. Los cruces se publican manualmente; no se simula avance automático.

La tabla se deriva de resultados reales, con 3/1/0 puntos y desempate por puntos, diferencia de goles, mini-tabla de enfrentamientos directos, goles a favor y menos goles en contra; el nombre queda como último orden provisional si la organización no resuelve un empate completo. No almacenes clasificaciones duplicadas. Las fechas son UTC. Null en ambos marcadores significa pendiente. No incluyas datos ficticios como si fueran reales.

## Convenciones

No persistas datos en memoria, localStorage ni archivos. Usa Netlify Database y Drizzle beta para compatibilidad con el adaptador. Cada cambio de esquema debe generar migración con `pnpm exec drizzle-kit generate --name <nombre>`. Nunca apliques migraciones manualmente. Las migraciones de temporadas, penaltis e integridad se escribieron a mano; la última (`20261022073000_enforce_match_score_integrity`) lleva el `snapshot.json` del esquema final para que `drizzle-kit generate` no vuelva a generar columnas o restricciones ya existentes. No edites migraciones ya aplicadas: avanza con una nueva. Las transacciones con bloqueo asesor protegen el límite de equipos y la generación única del calendario.

Todas las mutaciones deben comprobar el usuario y el rol admin en el servidor; el estado cliente solo controla presentación. No asignes automáticamente admin al primer visitante. El primer administrador se invita y recibe el rol desde Identity en Netlify. Mantén los callbacks de invitación y recuperación y las instrucciones de primer acceso.

Los cambios se verifican en el pipeline de la plataforma. No ejecutes servidores, compilaciones, typecheck ni pruebas locales cuando las instrucciones del entorno lo prohíban. No edites el árbol de rutas generado (`src/routeTree.gen.ts`); se versiona para que Vitest y TypeScript funcionen antes de `vite build`, y el plugin lo regenera al compilar. No crees commits ni PR manualmente.

## Notas de verificación

- La regla de sustitución de plazas de la Supercopa de Liga vive en `supercopaLigaCandidates` (`src/lib/tournament.ts`) y está cubierta por Vitest; la función de Netlify solo la invoca.
- `eslint.config.js` declara `console` y `process` como globals para `scripts/**/*.mjs`.
- Las reglas del compilador de React (`react-hooks` v7) son errores: no llames a `setState` de forma síncrona dentro de `useEffect`.
- Este repositorio es un proyecto de pruebas independiente con su propia base de datos e Identity; consulta `CAMBIOS-FASE23-VERSION-DE-PRUEBAS.md` antes de proponer una publicación.
