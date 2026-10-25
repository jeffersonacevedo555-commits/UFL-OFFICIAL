# Fase 16 — Consistencia al crear partidos durante cambios de temporada

## Cambio

La acción `match` ahora lee la temporada activa e inserta el partido dentro de una única transacción y después de obtener `pg_advisory_xact_lock(24001)`. Ese bloqueo también se usa en la acción `createSeason` y en las operaciones que generan partidos, de modo que una creación manual no puede tomar una temporada activa obsoleta mientras otra operación la cambia.

## Verificaciones incluidas

- `npm run verify:concurrency`: revisa estáticamente la transacción y el bloqueo compartido.
- `npm run verify:release`: ejecuta las verificaciones del torneo, las migraciones y la concurrencia.

## Límites

Estas comprobaciones son estáticas y no demuestran por sí solas que PostgreSQL esté disponible o que el comportamiento concurrente sea correcto en un despliegue real. La compilación, Vitest, TypeScript y una prueba contra una base PostgreSQL aislada siguen pendientes. No publicar todavía.
