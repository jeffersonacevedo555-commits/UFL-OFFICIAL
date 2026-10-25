# Fase 6 — Validación reproducible de la lógica de torneos

## Qué se añadió

- Script `scripts/verify-tournament.mjs`, ejecutable sin instalar dependencias de npm.
- Comando `npm run verify:tournament` en `package.json`.
- Cinco comprobaciones de extremo a extremo sobre las funciones puras: cuadro inicial de Copa, progresión hasta la final, desempates por global y penaltis, plazas de Supercopa de Liga sin duplicados y finales a ida/vuelta.
- Referencia al nuevo comando en `LEEME-ANTES-DE-PUBLICAR.md`.

## Resultado en este entorno

El comando `node --experimental-strip-types scripts/verify-tournament.mjs` terminó con cinco comprobaciones correctas. También pasó `node --experimental-strip-types --check netlify/functions/tournament.mts` y la integridad del ZIP.

## Límites

Esto no sustituye `npm test`, `npm run typecheck`, `npm run build` ni las pruebas contra una base de datos de prueba. La instalación de dependencias no terminó en este entorno. No aplicar migraciones ni publicar esta copia directamente en el sitio de producción.
