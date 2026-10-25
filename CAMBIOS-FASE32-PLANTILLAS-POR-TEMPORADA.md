# Fase 32 — Plantillas por temporada

## Objetivo
Preparar una base segura para futuros traspasos sin modificar `players.team_id`, que representa la asignación global heredada y se usa en vistas antiguas.

## Cambios
- Nueva tabla `player_season_rosters`, con una asignación única por jugador y temporada.
- Migración aditiva que inicializa las temporadas existentes usando la asignación conocida en `players.team_id`.
- La API GET expone las asignaciones por temporada.
- Al crear una temporada, se copia la última plantilla registrada; si no existe, se usa la asignación global actual.
- Al registrar un jugador nuevo, se añade a la plantilla de la temporada activa.
- La validación de estadísticas de partidos consulta primero la plantilla de la temporada del partido.
- El mercado usa la asignación de la temporada para mostrar el equipo de origen y evitar propuestas al mismo equipo.

## Límites y cautelas
- La migración no puede reconstruir traspasos anteriores que nunca se registraron. Para las temporadas preexistentes, inicializa la asignación que conoce el sistema en el momento de migrar.
- Esta fase no acepta ni ejecuta traspasos. Eso se añadirá después de adaptar todos los selectores de jugador a la plantilla de la temporada, para no dejar la UI de estadísticas incoherente.
- No se borran tablas ni se actualizan partidos o estadísticas históricos.
- No se publicó nada en producción.

## Verificación
Ejecutar `node scripts/verify-season-rosters.mjs` y `node scripts/verify-migrations.mjs`. Son auditorías estáticas, no reemplazan una ejecución de la migración en PostgreSQL ni pruebas de navegador.
