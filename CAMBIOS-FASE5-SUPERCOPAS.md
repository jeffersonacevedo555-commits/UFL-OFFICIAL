# Fase 5 — Integración de Supercopas

- Panel de administración: generación de las dos semifinales de Supercopa de Liga a ida y vuelta.
- Panel de administración: generación de la final de Supercopa de Liga a partir de los ganadores de las semifinales.
- Panel de administración: generación de la final de Supercopa de Europa a partir de los campeones de Champions y Europa League.
- Las finales de origen deben estar terminadas a ida y vuelta; los globales empatados requieren penaltis registrados.
- Para Supercopa de Liga se exige una Liga completa y una final de Copa resuelta. Si se repiten plazas por un doblete, se eligen candidatos distintos siguiendo el orden de clasificación de Liga.
- Se evita crear dos veces una Supercopa en la misma temporada y, tras una acción de generación, el panel vuelve a mostrar la temporada activa.

## Validación pendiente

Las funciones puras de competición y la progresión de Copa se probaron manualmente. Falta instalar dependencias y ejecutar el conjunto de pruebas, el chequeo TypeScript y la compilación de producción. No se ha ejecutado ninguna acción contra la base de datos real.
