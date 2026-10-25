# Fase 58 — Buscador de escenarios favorables y desfavorables

## Cambios

- Añadida clasificación automática de las combinaciones ya calculadas por el explorador de resultados.
- Presenta hasta cinco escenarios favorables y cinco desfavorables.
- Criterio favorable: menor número de equipos seleccionados descartados del objetivo; como segundo criterio, más puntos obtenidos por los equipos seleccionados en los partidos analizados.
- Criterio desfavorable: mayor número de equipos seleccionados descartados; como segundo criterio, menos puntos obtenidos por los equipos seleccionados.
- Incluye una explicación visible de que el orden es heurístico, no una probabilidad ni una predicción.
- La herramienta reutiliza las combinaciones locales existentes y no modifica resultados oficiales ni envía pronósticos al servidor.
- Añadida auditoría `scripts/verify-classification-scenario-ranking.mjs` y conectada a `verify:release`.

## Verificación

Se ejecutan las auditorías estáticas disponibles y se valida la integridad del ZIP. Las pruebas que requieren dependencias locales, base de datos o navegador se documentan por separado y no se consideran ejecutadas si el entorno no las permite.
