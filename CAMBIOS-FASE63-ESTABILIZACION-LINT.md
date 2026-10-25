# Fase 63 — Estabilización previa a publicación

## Motivo

La Fase 62.5 no pudo ejecutar Vitest, `tsc --noEmit` ni `eslint .` porque la copia no tenía `node_modules`. Al revisar el proyecto con la configuración real (`react-hooks` v7 con reglas del compilador como errores), quedaron confirmados 81 errores de lint que habrían hecho fallar `verify:complete` y, con ello, el despliegue.

## Correcciones (tercera ronda)

El segundo despliegue con dependencias dejó el resto del pipeline en verde: Vitest 49/49 ✓, TypeScript ✓, Lint ✓ y compilación (cliente + SSR) ✓. Solo falló una auditoría estática, `verify-team-statistics.mjs`, porque compara literales del JSX y no toleraba el atributo `key` añadido a los paneles:

1. `scripts/verify-team-statistics.mjs`, `verify-team-comparison.mjs` y `verify-season-analysis.mjs`: sus literales de `<TeamStatisticsPanel … />`, `<TeamComparisonPanel … />` y `<SeasonAnalysisPanel … />` se actualizaron a la forma actual con `key={selectedSeasonId ?? 'none'}`. La intención de la comprobación (el panel recibe equipos, temporadas y partidos) no cambia.
2. Se verificó contra el código actual cada literal y patrón de las auditorías restantes de la cadena (`verify-club-palmares`, `verify-historical-*`, `verify-player-*`, `verify-classification-*`): todos coinciden; el panel de palmarés y el de escenarios no necesitaban cambios.

## Correcciones (segunda ronda, a partir del log real del despliegue)

Con `node_modules` instalado en el despliegue, el pipeline ejecutó por primera vez la verificación completa sobre esta copia: Lint ✓ y Compilación ✓; quedaron tres fallos, ya corregidos:

1. **`src/routes/index.tsx` — `statsCompetition` sin declarar (typecheck, 6 errores TS)**: el filtro de competición de «Estadísticas de temporada» en la ficha de jugador se renderizaba, pero su estado `statsCompetition`/`setStatsCompetition` nunca se había declarado en `PlayerProfilesPanel` (el chequeo TypeScript no se ejecutaba desde antes de esta funcionalidad). Declarado con `useState('all')`; el filtro funciona como indica la interfaz.
2. **`src/lib/hall-of-fame.ts` — prueba Vitest «ignora estadísticas de goles inválidas»**: `goldenBoot` aceptaba registros con el nombre de posición «Sin nombre». Ahora lo rechaza explícitamente (junto a identificadores no positivos, goles no enteros o negativos y nombres vacíos), como define su prueba: un jugador sin nombre real no puede ganar la Bota de Oro.
3. **`scripts/verify-netlify.mjs` y `scripts/verify-deployment-safety.mjs`**: sus patrones exigían el comando de build literal `pnpm run verify:complete`. Aceptan ahora también la variante con instalación previa (`pnpm install … && pnpm run verify:complete`), manteniendo intacta la intención de la comprobación: la verificación completa sigue siendo obligatoria antes de publicar.

## Correcciones (primera ronda)

1. **`drizzle.config.ts`**: eliminado el `import { defineConfig } from 'drizzle-kit'` (la función es un envoltorio identitario). La configuración ahora exporta un objeto plano, de modo que la generación de migraciones no depende de resolver `drizzle-kit` desde el propio archivo de configuración (el CLI aporta su propio cargador). Sin cambios en dialecto, esquema ni directorio de salida.

1. **`src/routes/index.tsx`**
   - `HallOfFamePanel` ya no sincroniza `record` con un `useEffect`: los estados se inicializan desde `record` y el panel se remonta con `key` ligada a `updatedAt` del registro. Mismo comportamiento, sin render en cascada.
   - `TeamStatisticsPanel`, `TeamComparisonPanel` y `SeasonAnalysisPanel` reciben `key={selectedSeasonId ?? 'none'}` y perdieron el efecto que copiaba la temporada global al filtro local. Al cambiar de temporada el panel se reinicializa con la temporada nueva; los subfiltros (competición, equipos) se reinician también, en lugar de conservarse.
   - `ClassificationScenarioPanel`: la carga de escenarios guardados dejó de hacerse en un efecto. Ahora se hace en el inicializador del estado (el panel solo se monta al entrar en la vista) y en el manipulador `changeScenarioSeason` del selector de temporada, que además limpia pronósticos, referencias y comparaciones. El efecto de guardado persiste y solo escribe la temporada seleccionada. No hay escrituras en renders intermedios ni mezcla de temporadas.
   - `Date.now()` dentro de `saveCurrentSnapshot` movido a un helper de módulo (`createSnapshotId`) para cumplir la regla de pureza del compilador de React. Mismo valor en el mismo momento del clic.
   - Eliminado código muerto de `PlayerProfilesPanel` (`competitionLabels` + `statsByCompetition` + `completedSeasonMatches` + `completedMatchIds` + `playerSeasonStats`, nunca renderizado) y la variable sin uso `recordedMatches`. `roundDifference` pasó de inicialización inútil a `const` calculada tras el bucle.
2. **`eslint.config.js`**: se declara `URL` como global para `scripts/**/*.mjs` (los scripts usan `new URL(..., import.meta.url)`).
3. **Scripts de verificación**: `ok ? pass() : fail()` convertido en `if/else` en `verify-market.mjs`, `verify-market-decisions.mjs`, `verify-player-profiles.mjs`, `verify-season-rosters.mjs` y `verify-transfer-history.mjs`; escapadas innecesarias de `\"` corregidas en `verify-migrations.mjs` y `verify-historical-finals.mjs` (mismo valor de cadena/expresión regular).

## Persistencia de escenarios (Fase 62/62.5) — revisión

- Claves por temporada (`ufl-saved-scenarios:<seasonId>`), límite FIFO de ocho, filtrado registro a registro, JSON corrupto y fallos de almacenamiento gestionados: confirmado en el código y en `scripts/verify-classification-scenario-persistence.mjs`, conectado a `verify:release`.
- La importación/exportación JSON valida esquema, temporada, límite de 2 MB, duplicados y advertencias de versión.

## Estado de las comprobaciones

- **Pipeline real (despliegue con `node_modules`)**: Instalación con lockfile ✓, Auditorías estáticas hasta `verify-netlify` ✓ (Copa 11/11, migraciones, concurrencia 8/8, mercado 11/11 y 10/10, plantillas 10/10, historial 12/12, fichas 10/10, estadísticas 11/11, apariciones 11/11, trayectoria 10/10), Lint ✓, Compilación de producción ✓ (cliente y SSR). Fallaban el chequeo TypeScript (6 errores), Vitest (1 de 49) y la auditoría de Netlify por el comando de build: corregidos en la segunda ronda.
- ESLint (config real del proyecto, con el analizador TypeScript): 0 errores, 0 advertencias tras las correcciones (81 errores antes).
- Vitest, `tsc --noEmit`, `vite build` y `verify:complete`: no se ejecutaron en esta sesión por instrucción del entorno; los ejecuta el pipeline de la plataforma con el comando de build `pnpm run verify:complete` (`test` → `typecheck` → `lint` → `build`).
- Netlify Identity: activado en el proyecto de pruebas. Migraciones: se aplican solas al desplegar sobre la base vacía.
