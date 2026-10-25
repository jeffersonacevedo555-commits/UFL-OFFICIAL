# Cambios de la fase 54 — Comparación de escenarios y rangos de puntos

## Objetivo

Ampliar el simulador local de la fase 53 para comparar dos conjuntos de pronósticos sin modificar resultados oficiales y mostrar rangos de puntos que aún podrían obtener los equipos.

## Cambios incluidos

- Dos escenarios independientes, A y B, con pronósticos locales por partido.
- Selector para elegir cuál escenario editar y acciones para borrar A, B o ambos.
- Tabla comparativa de posición provisional, puntos de cada escenario y diferencia de puntos entre B y A.
- Cálculo por equipo de puntos actuales del escenario y máximo de puntos si gana todos los partidos que aún no tienen pronóstico completo.
- Aviso orientativo de posibles cambios de orden cuando los rangos de puntos de dos equipos se solapan.
- La interfaz aclara que los rangos son individuales, no probabilidades ni posiciones garantizadas, y que no se aplican criterios oficiales completos de desempate.
- Estilos adaptables para el selector de escenarios.
- Auditoría estática nueva `scripts/verify-classification-scenario-comparison.mjs`, integrada en `verify:release`; se actualizó la auditoría previa para reflejar los controles de borrado y la nueva estructura del cálculo.

## Integridad y alcance

- Los pronósticos se mantienen en estado local de la interfaz; no se envían al servidor ni se guardan en la base de datos.
- Solo entran en la simulación los marcadores completos válidos, entre 0 y 20.
- Los puntos máximos se calculan individualmente como puntos del escenario más 3 por cada partido todavía sin pronóstico completo del equipo.
- El aviso de solapamiento de rangos es una señal orientativa, no una prueba matemática de que un orden final específico sea posible.
- No se añadió migración ni se modificaron las rutas de escritura.

## Verificaciones realizadas

- `npm run verify:release`: correcto; todas las auditorías estáticas incluidas finalizaron.
- Auditoría de escenarios de la fase 53: 11/11.
- Auditoría de comparación de escenarios de la fase 54: 11/11.
- Transpilación sintáctica TSX con TypeScript 5.8.3: correcta.
- Integridad del ZIP: comprobada después de empaquetar.

## Pendiente antes de producción

El entorno no tiene `node_modules`. No se ejecutaron Vitest, typecheck integral, ESLint, build de producción, pruebas de navegador ni integración con PostgreSQL. La suite `verify:release` aquí es estática y no sustituye esas pruebas.
