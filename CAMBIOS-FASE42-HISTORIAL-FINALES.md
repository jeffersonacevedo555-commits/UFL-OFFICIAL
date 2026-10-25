# Fase 42 — Historial oficial de finales y subcampeones

## Objetivo
Añadir un registro administrable para campeones, subcampeones y marcadores oficiales de las competiciones, sin inferir finales ni alterar premios históricos existentes.

## Cambios incluidos
- Nueva pestaña pública **Finales históricas** con filtros por temporada y competición.
- Formulario disponible para administradores para crear, editar y eliminar registros.
- Registro de campeón y subcampeón como texto histórico congelado, de forma que un cambio futuro del nombre de un club no reescriba la historia.
- Formatos admitidos: campeonato de Liga, final a partido único y final a ida y vuelta.
- Marcadores de ida/vuelta y penaltis, con validación del global y del ganador.
- Tabla `historical_finals` y migración `20261023060000_historical_finals`.
- Índice único por temporada y competición para impedir registros duplicados.
- Validaciones de rango de goles, clubes distintos, formato y tanda de penaltis.
- Auditoría estática `scripts/verify-historical-finals.mjs`, incluida en `verify:release`.

## Verificaciones realizadas
- `npm run verify:release`: completado correctamente.
- Auditoría de finales históricas: 13/13.
- Verificación estática de migraciones: completada, incluida la nueva tabla.
- Transpilación sintáctica de `src/routes/index.tsx`, `netlify/functions/tournament.mts` y `db/schema.ts`: correcta.
- Integridad del ZIP: comprobada al empaquetar.

## Limitaciones
El entorno no tiene `node_modules`, por lo que no se ejecutaron Vitest, el chequeo integral de tipos, ESLint, build de producción ni integración real con PostgreSQL. La verificación de migraciones es estática, no ejecuta SQL contra una base de datos.

No se publicó el proyecto ni se modificó producción.
