# Fase 55 — Objetivos de clasificación

## Qué se incorporó

- Nuevo panel para elegir un club y un puesto objetivo, desde campeón hasta los puestos disponibles en la tabla.
- Evaluación condicionada al escenario A o B actualmente seleccionado.
- Cálculo del máximo teórico de puntos: puntos del escenario más tres por cada partido de Liga todavía sin pronóstico completo para ese equipo.
- Detección conservadora de objetivos imposibles por puntos: si al menos tantos equipos como el puesto objetivo ya tienen estrictamente más puntos que el máximo del club, se marca como imposible.
- Listado de los equipos que ya superan ese máximo, sus puntos y la diferencia.
- Avisos visibles: que el objetivo no esté descartado no significa que esté garantizado; no se calculan probabilidades ni desempates, los marcadores incompletos no se proyectan y la clasificación oficial no se modifica.
- Estilos adaptables a pantallas pequeñas y auditoría estática incorporada a `verify:release`.

## Alcance y límites

Todo el cálculo usa el estado local del simulador. No añade escrituras a la base de datos, no modifica los resultados oficiales y no publica cambios. El análisis de posibilidad se limita a puntos; no prueba que todos los resultados necesarios sean simultáneamente compatibles entre partidos compartidos.

## Verificación

Ejecutar `node scripts/verify-classification-objectives.mjs` y `npm run verify:release`. La comprobación estática no reemplaza el typecheck, lint, build, pruebas de navegador ni integración PostgreSQL.
