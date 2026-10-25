# Fase 39 — Centro de récords históricos

## Cambios
- Añadida la pestaña pública **Récords UFL**.
- Rankings conmutables de goles, asistencias, apariciones explícitas, minutos y premios MVP.
- Filtro por temporada concreta o todas las temporadas.
- Solo se procesan partidos finalizados; empates de valor se ordenan por nombre para mantener resultados estables.
- La tabla incluye el valor del ranking y un resumen de métricas para contextualizar cada jugador.
- Estilos adaptables a pantallas pequeñas.
- Añadida auditoría estática `verify:historical-records` al flujo `verify:release`.

## Integridad de los datos
Los rankings solo usan estadísticas existentes vinculadas a partidos finalizados. Apariciones se cuentan únicamente con `appeared === true`. No se inventan registros históricos. Minutos faltantes no se interpretan como ausencia de participación.

## Validación y límites
Se ejecuta la auditoría estática de esta fase, el flujo de verificaciones del proyecto y una comprobación de sintaxis TSX usando la API de TypeScript disponible en el entorno. No se afirma haber ejecutado pruebas completas de Vitest, chequeo integral de tipos, ESLint, build de producción, navegador ni integración PostgreSQL si las dependencias locales no están instaladas.
No se publicó el proyecto ni se modificó producción.
