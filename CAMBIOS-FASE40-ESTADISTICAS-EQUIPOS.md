# Cambios — Fase 40: estadísticas de equipos

## Objetivo

Incorporar un centro de rendimiento histórico de equipos basado en resultados existentes, con filtros por temporada y competición y consulta de enfrentamientos directos.

## Cambios

- Se añadió la pestaña **Estadísticas de equipos**.
- Se incorporó una tabla calculada de partidos jugados, victorias, empates, derrotas, goles a favor, goles en contra, diferencia, puntos y porcentaje de victorias.
- Los filtros permiten seleccionar todas las temporadas o una temporada concreta, y todas las competiciones o una competición concreta.
- Se añadió un resumen de partidos finalizados, goles totales y equipos con resultados.
- Se añadió el historial de enfrentamientos entre dos equipos, incluyendo fecha disponible, competición y marcador.
- Se añadieron estilos adaptables para escritorio y móvil.
- Se creó `scripts/verify-team-statistics.mjs` y se añadió a `verify:release`.
- No se añadió migración: las métricas se calculan con los resultados de partidos ya almacenados.

## Reglas de cálculo

- Solo cuentan partidos con ambos marcadores registrados.
- Victoria = 3 puntos; empate = 1 punto; derrota = 0 puntos.
- El porcentaje de victorias es victorias / partidos jugados × 100.
- Al combinar todas las competiciones, se suman deliberadamente sus resultados y puntos; la vista indica que no sustituye la clasificación oficial específica de cada torneo.
- No se calculan ni atribuyen títulos, ya que no se dispone de una fuente fiable para asignarlos en este panel.

## Verificación y limitaciones

La auditoría estática de esta fase comprueba las piezas clave de la interfaz y los cálculos. El paquete no incluye dependencias locales instaladas; por tanto, esta auditoría no equivale a pruebas completas de Vitest, chequeo integral de TypeScript, ESLint, compilación de producción, navegador o integración real con PostgreSQL.

No se publicó el sitio ni se modificó producción.
