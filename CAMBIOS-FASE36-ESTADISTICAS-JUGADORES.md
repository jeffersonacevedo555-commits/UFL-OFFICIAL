# Fase 36 — Estadísticas por jugador, temporada y competición

## Cambios
- La ficha del jugador ahora recibe los partidos y las estadísticas ya expuestos por la API; no se añadió una migración ni se modificó el esquema de base de datos.
- Añadido filtro de competición (todas, Liga, Champions, Europa League, Copa y ambas Supercopas).
- Los totales de goles, asistencias y premios MVP se calculan solo con registros de partidos finalizados de la temporada seleccionada.
- Añadido desglose por competición y contador de partidos que tienen una fila estadística guardada.
- Se aclara en la interfaz que el contador de partidos con registro no equivale necesariamente a apariciones: el modelo actual no registra explícitamente las apariciones.
- Añadidos estilos adaptables para tarjetas y filtro.
- Añadida auditoría estática `scripts/verify-player-season-stats.mjs` e integrada en `verify:release`.

## Verificación
La auditoría estática de esta fase comprueba los filtros, los agregados y el desglose. También se ejecutó la suite estática de release y una comprobación de sintaxis TSX con TypeScript disponible globalmente.

No se afirma que se hayan ejecutado Vitest, el typecheck completo, ESLint, el build de producción, pruebas de navegador o integración PostgreSQL: las dependencias locales (`node_modules`) no están instaladas en este paquete.

## Seguridad y publicación
No se ejecutaron despliegues ni se alteró producción. Esta fase consume datos existentes y no incluye cambios destructivos de base de datos.
