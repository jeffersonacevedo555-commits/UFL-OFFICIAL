# Fase 11 — coherencia ante guardados simultáneos

Se corrigió la coordinación de los guardados de resultados. Antes, el servidor adquiría un bloqueo asesor de PostgreSQL basado en el ID individual del partido. Como la ida y la vuelta tienen IDs distintos, dos peticiones simultáneas podían guardar ambas piernas usando una vista parcialmente obsoleta de la eliminatoria.

Ahora los guardados de resultados usan el mismo bloqueo asesor de transacción que la generación de rondas y el cambio de temporada. Esto serializa esas operaciones y reduce el riesgo de que una ronda se genere mientras otro administrador está cambiando un resultado.

También se corrigió el script `verify:tournament`: el total de comprobaciones se imprimía antes de ejecutar la última comprobación, así que el resumen no reflejaba el número real. Ahora el resumen se imprime al final.

## Validación disponible

- `npm run verify:tournament`: verificación manual de lógica pura con Node.js 22.13 o superior.
- `node --check netlify/functions/tournament.mts`: comprobación de sintaxis del servidor.
- La compilación completa, Vitest y la prueba contra PostgreSQL real siguen pendientes porque las dependencias no están instaladas y no hay una base de datos de prueba conectada.

Este cambio no se ha aplicado al sitio publicado ni a la base de datos de producción.
