# UFL — Fase 13: auditoría estática de migraciones

## Qué se añadió

- Se incorporó `scripts/verify-migrations.mjs` y el comando `npm run verify:migrations`.
- El script comprueba que las migraciones críticas existan y estén ordenadas, que los partidos existentes reciban la temporada inicial antes de exigir `season_id`, que la temporada activa sea única y que el diagnóstico previo de marcadores/penaltis esté antes de añadir las restricciones.
- El script también comprueba la presencia de las reglas esperadas para marcadores y penaltis.

## Resultado en esta copia

La auditoría estática pasó sus 14 comprobaciones. `npm run verify:tournament` también pasó sus 11 comprobaciones manuales.

## Límites importantes

Esto analiza los archivos SQL como texto; no ejecuta las migraciones ni demuestra que PostgreSQL las acepte. Siguen pendientes una base de datos de prueba, la instalación de dependencias, Vitest, TypeScript y la compilación completa. En este entorno la descarga de paquetes falló por un problema de conexión al registro de npm.

No se ha modificado la web ni la base de datos publicadas. No publiques esta copia todavía.
