# Cambios de la fase 51 — Comparación de equipos

## Objetivo

Añadir un panel público para comparar dos clubes con métricas calculadas a partir de partidos finalizados, conservando los filtros por temporada y competición.

## Cambios incluidos

- Nueva pestaña **Comparar equipos**.
- Selección de dos equipos distintos y filtros de temporada y competición.
- Comparación de partidos jugados, victorias, empates, derrotas, goles a favor/en contra, diferencia, puntos, porcentaje de victorias y promedio de goles.
- Desglose de rendimiento como local y visitante.
- Historial de enfrentamientos directos con fecha, competición y marcador guardado.
- Lista de los cinco partidos finalizados más recientes de cada equipo dentro del periodo filtrado.
- Estilos adaptables a pantallas pequeñas.
- Auditoría estática `scripts/verify-team-comparison.mjs`, integrada en `verify:release`.

## Criterios de integridad

- Solo se incluyen partidos con ambos marcadores registrados.
- Los puntos se calculan como 3 por victoria, 1 por empate y 0 por derrota.
- Al seleccionar todas las competiciones o temporadas, los datos se agregan explícitamente; no se infieren títulos ni se predicen resultados.
- No se añade migración de base de datos ni se alteran rutas de escritura.

## Verificación y límites

La auditoría de esta fase comprueba la presencia de los filtros, cálculos, tablas, estilos adaptables y conexión con el comando de release. Esta auditoría estática no sustituye las pruebas de interfaz en navegador, la compilación de producción ni las pruebas de integración con una base de datos.
