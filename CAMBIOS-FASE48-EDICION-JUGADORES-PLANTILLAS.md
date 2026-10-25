# Fase 48 — Edición auditada de jugadores y plantillas

## Cambios
- Se añade una acción administrativa `editPlayer` para cambiar el nombre y el equipo principal de un jugador.
- Las ediciones de jugador se guardan en una transacción y generan un evento `updated` en `admin_audit_events` con instantáneas anterior y posterior.
- Se añade la acción `updateSeasonRoster` para cambiar la asignación de un jugador en una temporada específica sin reescribir las asignaciones de otras temporadas.
- Los cambios de plantilla se validan y se registran como eventos de auditoría.
- El panel administrativo incorpora controles para editar jugadores existentes y reasignar jugadores en una temporada concreta.
- No se añade una migración: el esquema de auditoría existente ya admite las entidades `player` y `roster` y la acción `updated`.

## Consideraciones
- Cambiar el equipo principal del jugador no altera automáticamente las plantillas históricas.
- La reasignación manual de plantilla no crea un traspaso oficial; queda registrada como una modificación administrativa de plantilla.
- La edición y la auditoría se ejecutan en la misma transacción.

## Verificación
- Se añade `scripts/verify-player-roster-admin.mjs` y se incorpora a `verify:release`.
- La verificación es estática; no sustituye pruebas de integración con PostgreSQL ni la compilación de producción.
