# Cambios de la fase 52 — Análisis de temporadas

## Objetivo

Incorporar un centro de análisis histórico para comparar el rendimiento de clubes entre temporadas y revisar la evolución de resultados por ronda.

## Cambios incluidos

- Nueva pestaña **Análisis de temporadas**.
- Filtros por equipo, temporada y competición.
- Comparación anual de partidos, victorias, empates, derrotas, goles a favor/en contra, diferencia, puntos y puntos por partido.
- Resumen del equipo líder por temporada cuando se muestran todos los clubes.
- Posición estadística mostrada únicamente para Liga; otras competiciones no se presentan como clasificaciones oficiales.
- Balance de un equipo en una temporada y competición seleccionadas.
- Evolución acumulada por ronda, usando el texto de ronda registrado en cada partido.
- Estilos adaptables y auditoría estática integrada en `verify:release`.

## Criterios de integridad

- Solo se usan partidos finalizados con ambos marcadores disponibles.
- Los puntos se calculan con 3 por victoria, 1 por empate y 0 por derrota.
- Los datos de torneos distintos solo se agregan cuando el usuario selecciona explícitamente todas las competiciones.
- La evolución por ronda se describe como resumen estadístico y no como clasificación oficial en torneos eliminatorios.
- No se añade migración de base de datos ni se alteran rutas de escritura.

## Verificación y límites

La auditoría `scripts/verify-season-analysis.mjs` comprueba la presencia de la pestaña, filtros, cálculos, resumen por ronda, estilos y conexión con `verify:release`. Esta auditoría estática no sustituye pruebas completas de navegador, typecheck, lint, compilación o integración con PostgreSQL.
