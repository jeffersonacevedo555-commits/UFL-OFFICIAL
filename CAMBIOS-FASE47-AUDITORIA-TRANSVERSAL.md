# Fase 47 — Auditoría administrativa transversal

## Objetivo
Ampliar la trazabilidad administrativa más allá de las finales históricas para registrar creaciones y cambios de partidos, jugadores, equipos, asignaciones de plantilla, traspasos y propuestas de mercado.

## Cambios incluidos
- Registra la creación de propuestas de mercado y su retirada, aceptación o rechazo.
- Audita también las propuestas pendientes que se rechazan automáticamente después de aceptar otro traspaso.
- Registra la creación de equipos y jugadores, junto con la asignación inicial de plantilla.
- Registra las asignaciones de plantilla copiadas al crear una temporada.
- Registra la creación de partidos individuales, calendarios completos y rondas generadas de Copa y Supercopas.
- Conserva la auditoría transaccional de modificaciones de resultados, incluyendo estadísticas anteriores y posteriores.
- Amplía el panel con filtros independientes por entidad y acción, búsqueda de administradores, temporadas, clubes y jugadores, y exportación CSV de los eventos filtrados.
- Resume partidos, asignaciones de plantilla, traspasos, jugadores y propuestas con nombres de clubes/jugadores cuando están disponibles.
- Añade `scripts/verify-admin-audit-events.mjs` y lo integra en `verify:release`.

## Migración
Incluye `netlify/database/migrations/20261023063000_admin_audit_events/migration.sql`. Debe aplicarse antes de desplegar esta versión. No se aplicó a producción.

## Límites conocidos
La auditoría cubre las rutas administrativas instrumentadas de la aplicación; no captura escrituras directas a la base de datos ni reconstruye eventos anteriores a la instalación. No se implementaron operaciones de edición o eliminación de jugadores/partidos que la aplicación no ofrecía previamente.

## Verificación
La verificación estática transversal comprueba el esquema, la migración y las rutas de escritura instrumentadas. La suite `npm run verify:release` terminó con código de salida 0; la auditoría transversal obtuvo 16/16 comprobaciones estáticas y la sintaxis de los archivos TypeScript/TSX modificados pasó con la biblioteca TypeScript disponible globalmente. El diagnóstico detectó que no existe `node_modules` y recomendó usar pnpm por el `pnpm-lock.yaml`; por ello no se ejecutaron Vitest, el typecheck completo, ESLint, la compilación de producción ni una integración real con PostgreSQL.

## Producción
No se publicó el proyecto ni se modificó el sitio de producción.
