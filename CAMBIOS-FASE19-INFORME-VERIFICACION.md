# Fase 19 — Informe guardado de verificación

## Cambios

- `scripts/verify-complete.mjs` ahora guarda un informe Markdown y otro JSON con fecha, versión de Node, gestor detectado y estados de cada comprobación.
- El resumen distingue verificaciones aprobadas, fallidas y pendientes por falta de dependencias.
- `.gitignore` excluye los informes locales generados.
- La herramienta no despliega el sitio ni ejecuta migraciones.

## Cómo usarlo

Desde la carpeta del proyecto, ejecutar `pnpm run verify:complete` o `npm run verify:complete`. Al terminar, revisar `reports/verification-latest.md`. Si faltan dependencias, el informe lo indicará y no debe considerarse una aprobación de publicación.

## Limitaciones actuales

En este entorno no están instaladas las dependencias del proyecto y no se ha podido acceder al registro npm. Por ello, Vitest, TypeScript, ESLint y la compilación pueden quedar pendientes. Las migraciones PostgreSQL tampoco se ejecutan con este comando.
