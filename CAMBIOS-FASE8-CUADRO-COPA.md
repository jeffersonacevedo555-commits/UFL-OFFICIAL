# UFL — Fase 8: conservar el cuadro de Copa

## Cambio

La progresión de Copa ya no empareja a los ganadores únicamente de dos en dos según el orden de los registros. Conserva los lados del cuadro:

- Cuartos: ganadores de los cruces 1 y 8; 4 y 5; 2 y 7; 3 y 6.
- Semifinales: ganadores de los cuartos 1 y 2; ganadores de los cuartos 3 y 4.
- Final: ganadores de ambas semifinales.

## Validación realizada

- `tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext src/lib/tournament.ts` pasó.
- `node --experimental-strip-types --check netlify/functions/tournament.mts` pasó.
- `node --experimental-strip-types scripts/verify-tournament.mjs`: 8 comprobaciones manuales pasaron.
- El ZIP se comprueba por integridad después de generarse.

## Pendiente antes de publicar

No se ejecutaron Vitest, el typecheck completo ni la compilación de producción; no se probaron las migraciones contra una base de datos de ensayo. Esta entrega no se debe publicar aún ni usar para reemplazar la web real.
