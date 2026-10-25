# UFL — Fase 29: cálculo automático de premios del Salón de la Fama

## Cambios

- Añadida la acción administrativa `calculateHallOfFame`, protegida por la comprobación de rol `admin` y la validación de origen existente.
- Calcula el campeón y subcampeón de Liga únicamente si hay 24 equipos con 23 partidos y los criterios disponibles permiten ordenar el podio sin empate irresuelto.
- Calcula campeones de Copa, Champions, Europa League y ambas Supercopas cuando existe una final válida a ida y vuelta, con penaltis registrados si el global queda empatado.
- Calcula la Bota de Oro sumando los goles de los partidos finalizados de la temporada seleccionada; conserva los empates.
- Guarda los nombres de los equipos y goleadores como instantánea histórica. Al recalcular, reemplaza los premios automáticos conocidos, conserva otros campos de premios y no altera Balón de Oro, titulares ni suplentes.
- Añadido el botón administrativo «Calcular y guardar premios automáticos» y una presentación legible de la Bota de Oro.

## Verificación ejecutada

- `node scripts/verify-migrations.mjs` — correcto.
- `node scripts/verify-netlify.mjs` — correcto.
- `node scripts/verify-deployment-safety.mjs` — correcto.
- `node --experimental-strip-types scripts/verify-tournament.mjs` — 11/11 comprobaciones.
- `node scripts/verify-concurrency.mjs` — 8/8 comprobaciones.

## Límites de esta verificación

No se ejecutaron Vitest, TypeScript, ESLint, compilación de producción ni pruebas de navegador o PostgreSQL: esta copia no incluye `node_modules` y no se ha instalado el árbol de dependencias. Las auditorías disponibles son estáticas y no equivalen a probar una base de datos real. No se ha desplegado ni publicado el proyecto.
