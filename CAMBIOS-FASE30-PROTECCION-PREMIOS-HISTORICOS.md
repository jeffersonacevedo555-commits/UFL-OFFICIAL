# UFL — Fase 30: protección de premios históricos y resultado del cálculo

## Cambios

- Corregido el recálculo del Salón de la Fama: si los datos actuales no permiten determinar un premio automático, se conserva el último valor histórico guardado en vez de eliminarlo.
- Los premios automáticos que sí se pueden calcular se actualizan; los campos manuales y premios ajenos al cálculo se mantienen.
- La función administrativa devuelve las categorías calculadas y las que quedaron pendientes por falta de datos suficientes.
- La interfaz informa al administrador del número de premios calculados y pendientes y explica que los datos históricos no resueltos se conservan.
- Añadidas dos pruebas unitarias para la combinación segura de premios calculados y valores históricos previos.

## Verificación ejecutada

- Auditoría de migraciones: correcta.
- Auditoría estática de Netlify: correcta.
- Auditoría de seguridad previa a publicar: correcta.
- Verificaciones de torneos: 11/11.
- Auditoría estática de concurrencia: 8/8.
- Pruebas directas de `mergeCalculatedAwards` ejecutadas con Node: 2/2.

## Límites

No se ejecutaron Vitest, TypeScript, ESLint, compilación de producción, pruebas de navegador ni integración PostgreSQL porque el proyecto no tiene instaladas las dependencias (`node_modules`). Las comprobaciones realizadas no equivalen a una prueba de extremo a extremo. No se desplegó ni publicó nada.
