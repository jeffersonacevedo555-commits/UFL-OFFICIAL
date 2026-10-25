# Fase 60 — Centro comparativo de escenarios

## Cambios
- Añade selección de hasta cuatro simulaciones guardadas de la temporada actual.
- Resume por equipo el mejor puesto, peor puesto, amplitud de variación, puesto medio descriptivo y rango de puntos dentro de las simulaciones elegidas.
- Presenta la posición y los puntos por cada escenario seleccionado.
- Identifica los partidos pendientes cuyo pronóstico difiere entre las simulaciones; los partidos sin pronóstico se muestran de forma explícita.
- Añade estilos adaptables para pantallas estrechas.
- Integra una auditoría estática nueva en `verify:release`.

## Alcance y limitaciones
Las simulaciones continúan siendo copias locales, no oficiales y no persistentes tras cerrar el panel o recargar la página. Los rangos describen únicamente los escenarios seleccionados; no son límites matemáticos de la temporada ni probabilidades. El puesto medio es una medida descriptiva y no considera desempates oficiales.

## Verificación
Se ejecutan auditorías estáticas específicas y la suite `verify:release`. La ejecución de build, typecheck completo, ESLint, Vitest y pruebas de navegador/PostgreSQL depende de que las dependencias locales estén instaladas.
