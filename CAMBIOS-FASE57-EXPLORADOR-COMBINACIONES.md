# Fase 57 — Explorador de combinaciones de resultados

## Cambios

- Añadido un explorador de combinaciones para los partidos de Liga que siguen sin pronóstico completo en el escenario A o B activo.
- Permite seleccionar hasta cuatro partidos; para cada partido se contemplan victoria local, empate o victoria visitante, de modo que el máximo es 3⁴ = 81 combinaciones.
- Enumera todas las combinaciones seleccionadas y evalúa, para los equipos del comparador multiequipo, si algún objetivo top-k queda descartado por puntos en cada combinación.
- Recalcula los puntos proyectados y el máximo teórico después de fijar los resultados hipotéticos seleccionados; los demás partidos pendientes permanecen abiertos.
- Mantiene el análisis en estado local del navegador, separado de resultados oficiales y de la base de datos.
- Añadida auditoría estática `scripts/verify-classification-combinations.mjs`, conectada a `verify:release`.
- Añadidos estilos adaptables para selección de partidos y tabla de combinaciones.

## Criterios y límites

- El análisis se basa en puntos, no calcula desempates oficiales.
- “Sin nuevos descartes por puntos” no significa que un puesto esté garantizado.
- Las combinaciones no asignan probabilidades; enumeran las alternativas de los partidos seleccionados.
- Se evalúan como máximo cuatro partidos para mantener acotado el volumen de combinaciones.
- Los partidos con marcador parcialmente guardado no se incluyen como partidos pendientes proyectables.

## Verificación

La auditoría estática de la fase verifica presencia de controles, enumeración de resultados, cálculo de puntos y máximos, presentación de resultados y conexión a `verify:release`. La ejecución de pruebas que requieren dependencias instaladas debe registrarse por separado; no se presume que una auditoría estática sustituya compilación, pruebas de navegador o integración con PostgreSQL.
