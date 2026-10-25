# Cambios — Fase 36: estadísticas de jugador por temporada

## Objetivo
Ampliar las fichas de jugadores para consultar goles, asistencias y premios MVP de la temporada seleccionada, con desglose por competición.

## Cambios
- La ficha recibe partidos y estadísticas existentes de la API, sin crear tablas ni migraciones nuevas.
- Solo se agregan estadísticas asociadas a partidos finalizados y pertenecientes a la temporada seleccionada.
- Incluye filtro de competición: todas, Liga, Champions, Europa League, Copa y ambas Supercopas.
- Muestra tarjetas con goles, asistencias, MVP y cantidad de partidos con registro; la tabla detalla las cifras por competición.
- La interfaz aclara que los partidos con registro no equivalen necesariamente a apariciones, ya que el modelo actual no registra presencia explícita de todos los jugadores.
- Añade `scripts/verify-player-season-stats.mjs` y lo integra en `verify:release`.

## Validación
La auditoría estática de esta fase comprueba las conexiones de datos, los filtros por temporada/competición y partido finalizado, las agregaciones y el desglose. La suite `npm run verify:release` pasó sus auditorías estáticas. La sintaxis TSX se verificó mediante transpilación aislada con TypeScript global.

No se ejecutaron Vitest, el typecheck completo, ESLint, el build de producción, pruebas de navegador ni integración con PostgreSQL porque el paquete no contiene `node_modules`.

No se publicó nada ni se modificó el sitio en producción.
