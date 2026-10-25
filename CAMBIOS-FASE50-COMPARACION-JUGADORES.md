# Cambios — Fase 50: comparación de jugadores

## Objetivo
Añadir una vista para comparar dos futbolistas utilizando únicamente estadísticas ya guardadas y vinculadas a partidos finalizados.

## Cambios incluidos
- Nueva pestaña **Comparar jugadores**.
- Selector de dos jugadores, temporada o todas las temporadas, y competición.
- Comparación de goles, asistencias, apariciones registradas, minutos y premios MVP.
- Tabla de desglose por competición y diferencia entre jugadores.
- Resumen de clubes por temporada y traspasos registrados.
- Diseño adaptable para pantallas pequeñas.
- Script `scripts/verify-player-comparison.mjs`, añadido a `verify:release`.

## Reglas de datos
- Solo se cuentan registros estadísticos asociados a partidos finalizados dentro de los filtros seleccionados.
- Apariciones solo se cuentan cuando `appeared === true`.
- Los minutos solo suman los minutos registrados; los datos faltantes no se estiman.
- El historial de clubes y traspasos procede de las asignaciones y transferencias existentes.
- No se añade migración ni se modifican los datos deportivos existentes.

## Verificación
La auditoría estática de comparación comprueba 13 condiciones funcionales de integración. También se ejecuta la suite estática de lanzamiento y una comprobación de sintaxis TypeScript/TSX. Estas comprobaciones no sustituyen las pruebas de Vitest, el chequeo completo de tipos, ESLint, la compilación de producción o pruebas de integración PostgreSQL.
