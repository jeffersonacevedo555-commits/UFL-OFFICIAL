# Cambios de la fase 53 — Escenarios de clasificación

## Objetivo

Incorporar un simulador local para probar resultados hipotéticos de los partidos pendientes de Liga y observar su efecto en una tabla provisional.

## Cambios incluidos

- Nueva pestaña **Escenarios de clasificación**.
- Selector de temporada vinculado inicialmente a la temporada seleccionada en la aplicación.
- Listado de partidos de Liga sin ambos marcadores guardados.
- Campos locales para pronosticar goles de local y visitante, con valores entre 0 y 20.
- Un partido solo se agrega al escenario si ambos marcadores son válidos.
- Tabla con puntos, goles, diferencia, balance y separación de partidos reales y simulados.
- Botón para borrar todos los pronósticos locales.
- Diseño adaptable para escritorio y móvil.
- Auditoría estática `scripts/verify-classification-scenarios.mjs` integrada en `verify:release`.

## Integridad y alcance

- Los pronósticos se mantienen únicamente en el estado de la interfaz y no se envían al servidor.
- Los partidos finalizados se leen desde los marcadores existentes; los partidos pendientes sin pronóstico no suman puntos ni goles.
- La tabla se etiqueta como escenario no oficial y no intenta calcular probabilidades ni aplicar todos los criterios oficiales de desempate.
- No se añade migración ni se modifican rutas de escritura.

## Verificación y límites

La auditoría estática comprueba la presencia de los controles, cálculos, etiquetas de simulación, estilos y conexión con `verify:release`. Esta auditoría no sustituye las pruebas completas de navegador, Vitest, typecheck, lint, compilación o integración con PostgreSQL.
