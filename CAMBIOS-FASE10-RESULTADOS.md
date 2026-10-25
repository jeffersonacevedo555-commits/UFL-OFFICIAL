# Cambios de la fase 10: coherencia de resultados

## Problema corregido

Si la vuelta de una eliminatoria ya tenía una tanda de penaltis guardada, editar después el marcador de la ida podía cambiar el resultado global y dejar esa tanda inválida en la base de datos. La validación para avanzar de ronda acabaría rechazando la eliminatoria, pero el panel todavía podía guardar esa combinación incoherente.

## Solución

- Se añadió `assertPenaltyDecisionStillValidAfterFirstLegEdit` a `src/lib/tournament.ts`.
- Antes de guardar una modificación de la ida, la función de servidor consulta la vuelta correspondiente.
- Si la vuelta ya tiene penaltis, se impide guardar una ida incompleta o un resultado que haga que el global deje de estar empatado.
- El mensaje indica que primero debe eliminarse la tanda desde la vuelta si se quiere cambiar el resultado de la ida.
- Se añadieron pruebas de regresión a `src/lib/tournament.test.ts` y al script independiente `scripts/verify-tournament.mjs`.

## Validación realizada en este entorno

- `node --experimental-strip-types scripts/verify-tournament.mjs`: 11 comprobaciones manuales pasaron.
- `tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext src/lib/tournament.ts`: pasó.
- `node --check --experimental-strip-types netlify/functions/tournament.mts`: pasó.

## Pendiente

No se ejecutaron `npm test`, `npm run build` ni el typecheck completo del proyecto, porque las dependencias no están instaladas aquí. No se aplicaron migraciones a una base de datos real. Esta fase es una copia de desarrollo, no un paquete listo para publicar.
