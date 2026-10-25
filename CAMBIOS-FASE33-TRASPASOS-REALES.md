# Fase 33 — Decisiones y traspasos reales

## Cambios
- El administrador puede aceptar o rechazar propuestas pendientes.
- La aceptación actualiza la plantilla de la temporada seleccionada y el estado de la propuesta dentro de una transacción.
- Las filas de la propuesta y de la asignación de plantilla se bloquean durante la decisión para reducir conflictos entre solicitudes concurrentes.
- Se verifica que el jugador siga perteneciendo al equipo de origen de la propuesta.
- Si un traspaso se acepta, las demás propuestas pendientes del mismo jugador en esa temporada se marcan rechazadas porque su equipo de origen quedó obsoleto.
- La migración amplía los estados permitidos a `pending`, `withdrawn`, `accepted` y `rejected`, sin eliminar propuestas.
- La interfaz muestra el estado y solicita confirmación antes de aceptar un traspaso.

## Alcance histórico
Solo se modifica `player_season_rosters` para la temporada de la propuesta. No se actualiza `players.team_id`, partidos ni estadísticas antiguas. Las temporadas anteriores quedan intactas.

## Validación
La auditoría estática está en `scripts/verify-market-decisions.mjs`. Deben ejecutarse además TypeScript, ESLint, Vitest, compilación y pruebas de integración contra PostgreSQL antes de desplegar. Esta fase no se publica automáticamente.
