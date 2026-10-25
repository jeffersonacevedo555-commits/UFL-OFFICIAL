# Fase 56 — Análisis de objetivos para varios equipos

## Cambios

- Se añadió un comparador para seleccionar hasta cinco clubes y evaluar si cada uno sigue dentro de las posibilidades matemáticas por puntos para un mismo puesto objetivo.
- La tabla compara puntos del escenario activo, máximo teórico, cantidad de equipos que ya superan ese máximo y el veredicto por puntos.
- Se añadió un análisis de sensibilidad para cada partido de Liga pendiente que todavía no tenga pronóstico completo: victoria local, empate o victoria visitante.
- Para cada resultado hipotético se actualizan los puntos y el máximo alcanzable de los dos equipos implicados y se muestra qué objetivos seleccionados quedarían descartados por puntos.
- El análisis altera un único partido cada vez; no simula todos los resultados futuros ni calcula probabilidades o desempates.
- Se mantiene el carácter local y no oficial de los pronósticos. No hay cambios de esquema ni persistencia de resultados simulados.
- Se añadió `scripts/verify-multi-team-objectives.mjs` y se conectó a `verify:release`.

## Verificación

La auditoría específica valida la presencia de controles, comparación de hasta cinco equipos, los tres resultados hipotéticos, el ajuste de puntos/máximos, advertencias y estilos. Las pruebas completas que requieren dependencias instaladas deben ejecutarse en un entorno con `node_modules` disponible.
