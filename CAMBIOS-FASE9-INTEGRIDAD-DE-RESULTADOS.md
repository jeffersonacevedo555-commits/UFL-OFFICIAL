# Fase 9 — integridad de resultados

## Cambios

- Añadida la migración `20261022073000_enforce_match_score_integrity`.
- La base de datos exige que los dos marcadores regulares estén ambos vacíos o ambos registrados y dentro del rango 0–99.
- La base de datos exige que una tanda de penaltis tenga ambos valores, un ganador, marcador regular completo y que pertenezca a una competición eliminatoria en la vuelta.
- El esquema Drizzle refleja estas restricciones.
- La verificación independiente incorpora pruebas de vueltas mal emparejadas y resultados incompletos.

## Validación ejecutada

- `node --experimental-strip-types scripts/verify-tournament.mjs`: comprobaciones manuales de la lógica de competiciones.
- `tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext src/lib/tournament.ts`: comprobación aislada de TypeScript.
- El analizador de TypeScript reportó cero errores de sintaxis en `tournament.mts` y `schema.ts`.
- Se comprobó la integridad del ZIP generado.

## Limitaciones

No se ha ejecutado Vitest ni la compilación completa, porque no están instaladas las dependencias. La migración es nueva y no se ha aplicado a la base de datos real. Debe probarse primero en una base de datos de prueba y con una copia de seguridad antes de producción.
