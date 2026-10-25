# Fase 37 — Apariciones y minutos jugados

## Cambios
- Añade `appeared` y `minutes` a las estadísticas de cada jugador en partido.
- Incluye migración aditiva para la base de datos; no elimina ni reescribe filas históricas.
- El editor de resultados permite marcar participación y registrar minutos (0–120), además de goles, asistencias y MVP.
- La ficha del jugador muestra apariciones explícitas y minutos por temporada/competición.
- Los registros antiguos se mantienen con `appeared = false` y `minutes = 0` hasta que la organización edite esos partidos; no se infieren apariciones que no estaban guardadas.
- Se eliminó la tabla de estadísticas duplicada que había quedado en la ficha tras la fase 36.

## Verificación
Se añadió `verify:player-appearances` con comprobaciones estáticas del esquema, migración, API, editor y ficha. Esto no sustituye pruebas completas de base de datos ni build de producción.

## Publicación
No se publicó ni desplegó ningún cambio.
