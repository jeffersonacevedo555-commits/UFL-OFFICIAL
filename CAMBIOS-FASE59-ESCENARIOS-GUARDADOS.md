# Fase 59 — Guardar y comparar simulaciones

## Cambios
- Añadido un gestor de hasta ocho snapshots locales por temporada para las simulaciones de clasificación.
- Cada snapshot conserva nombre, escenario A/B, copia de los pronósticos y tabla proyectada (posición, puntos y partidos pronosticados).
- Permite cargar y eliminar snapshots mientras el panel siga abierto.
- Permite seleccionar una simulación como referencia y comparar la posición y los puntos del escenario activo contra esa referencia, con deltas por equipo.
- Añadidos controles y tablas adaptables a pantallas estrechas.
- Añadida la auditoría `scripts/verify-classification-saved-scenarios.mjs`, el comando `verify:classification-saved-scenarios` y su ejecución dentro de `verify:release`.

## Límites
- Las simulaciones guardadas viven solo en el estado local del panel: no se envían al servidor, no son resultados oficiales y se pierden al recargar o desmontar el panel.
- Los snapshots están separados por temporada y el límite es de ocho por temporada.
- Las posiciones comparan la clasificación de puntos del escenario; no calculan probabilidades ni incorporan criterios de desempate oficiales más allá del orden ya usado por el simulador.

## Verificación
Pendiente de registrar los resultados de las auditorías estáticas ejecutadas para este paquete. No se despliega a producción ni se modifica la base de datos.

### Resultados ejecutados
- `verify:release`: salida 0.
- `verify:classification-saved-scenarios`: 11/11.
- Auditoría de rankings de escenarios: 11/11.
- Auditoría del explorador de combinaciones: 12/12.
- Auditoría de objetivos multiequipo: 11/11.
- Transpilación sintáctica TSX con TypeScript 5.8.3: correcta.
- `npm run typecheck`: no pudo completar porque faltan dependencias locales y la definición `vite/client` (`node_modules` no está presente).
- No se ejecutaron Vitest, ESLint, compilación de producción ni pruebas de navegador/PostgreSQL.
