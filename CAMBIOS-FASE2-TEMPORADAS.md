# Fase 2 — base del historial de temporadas

## Implementado en esta copia de trabajo

- Añadida la tabla `seasons` con nombre, fecha de creación y marca de temporada actual.
- Cada partido queda asociado a una temporada mediante `season_id`.
- La migración está diseñada para asignar los partidos existentes a `Temporada 1`; el SQL no elimina ni reescribe sus resultados, pero todavía no se ha ejecutado contra la base de datos real.
- El índice de partidos ahora permite repetir cruces en temporadas distintas, pero evita duplicarlos dentro de la misma temporada.
- La API devuelve las temporadas y guarda los partidos nuevos en la temporada actual.
- El panel de administración permite crear y activar una temporada nueva con confirmación.
- La web permite consultar las tablas, partidos y estadísticas de una temporada seleccionada.
- Añadidas pruebas para la separación de partidos por temporada.

## Pendiente y precauciones

- La generación automática de octavos de Copa ya está conectada al panel y a la API, pero aún no existe el control administrativo para resolver manualmente un empate final; en ese caso la generación se detiene de forma segura.
- Aún no se ha ejecutado la migración contra una base de datos real ni se ha compilado la aplicación completa. No publicar esta copia todavía.
- Antes de aplicar la migración en producción, hay que probarla sobre una copia de la base de datos y confirmar que Netlify aplica las migraciones de este directorio como se espera.
- Los equipos y los jugadores siguen siendo registros compartidos entre temporadas; el seguimiento de traspasos/plantillas por temporada se desarrollará más adelante.
