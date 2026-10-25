# Fase 38 — Trayectoria estadística acumulada

## Cambios
- Incorpora a cada ficha una sección de trayectoria que consolida estadísticas de todas las temporadas.
- Presenta totales acumulados de goles, asistencias, apariciones, minutos y premios MVP.
- Añade una tabla por temporada para comparar la evolución del jugador.
- Solo procesa estadísticas asociadas a partidos finalizados y al jugador seleccionado.
- Las apariciones cuentan exclusivamente filas marcadas con `appeared = true`; no se infieren presencias históricas.
- No requiere migración de base de datos: utiliza los registros existentes de partidos y estadísticas.
- Añade estilos responsive y una auditoría estática específica.

## Verificación
`verify:player-career-history` valida estáticamente los cálculos y la presencia de la interfaz. Esta auditoría no sustituye pruebas completas de tipos, navegador ni integración con PostgreSQL.

## Publicación
No se ha desplegado ni modificado producción.
