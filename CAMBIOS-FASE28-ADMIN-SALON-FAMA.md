# Fase 28 — Editor administrativo del Salón de la Fama

## Cambios
- Se añadió un editor visible únicamente para usuarios cuya sesión tiene el rol `admin`.
- Permite elegir el Balón de Oro, exactamente 11 titulares y 7 suplentes.
- La selección se envía a la operación `saveHallOfFame` existente del endpoint `/api/tournament`.
- Se conserva el objeto de premios existente al actualizar una selección, en vez de reemplazarlo por un objeto vacío.
- El servidor ya valida rol admin, temporada existente, existencia de jugadores y unicidad de los 18 jugadores. Se mantiene esa validación en servidor como autoridad final.
- Se añadieron estilos básicos para el editor.

## Validación ejecutada
- `node scripts/verify-migrations.mjs`: correcto.
- `node scripts/verify-netlify.mjs`: correcto.
- `node scripts/verify-deployment-safety.mjs`: correcto.
- `node --experimental-strip-types scripts/verify-tournament.mjs`: 11/11 correctas.
- `node scripts/verify-concurrency.mjs`: 8/8 correctas.

## Pendiente
- No hay `node_modules` en el entorno, por lo que no se ejecutaron Vitest, TypeScript, ESLint ni el build de producción.
- No se ejecutó la migración contra PostgreSQL real.
- No se verificó la interfaz en navegador ni la sesión real de Netlify Identity.
- El cálculo automático de campeones y Bota de Oro aún no está conectado a la operación de guardado; los premios existentes se conservan, pero no se generan automáticamente en esta fase.

## Seguridad y despliegue
No se publicó nada ni se conectó este código a la base de datos de producción. No se deben ejecutar migraciones ni desplegar hasta completar las pruebas pendientes en el entorno de pruebas.
