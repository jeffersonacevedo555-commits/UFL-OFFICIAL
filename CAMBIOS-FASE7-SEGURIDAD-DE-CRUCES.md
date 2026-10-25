# Fase 7 — Seguridad de cruces y desempates

## Cambios

- La progresión de Copa verifica que ningún club aparezca en dos cruces de la misma ronda.
- Cada vuelta debe corresponder de forma única a una ida, y no se permiten vueltas huérfanas o repetidas.
- La resolución de una eliminatoria rechaza marcadores de penaltis si el global ya tiene un ganador; los penaltis solo deciden un global empatado.
- Se añadieron pruebas unitarias para ambos casos y comprobaciones independientes al script sin dependencias.

## Validación realizada en este entorno

- `node --experimental-strip-types scripts/verify-tournament.mjs`: siete comprobaciones manuales correctas.
- `node --experimental-strip-types --check netlify/functions/tournament.mts`: correcto.
- `node --experimental-strip-types --check src/lib/tournament.ts`: correcto.

## Límites

No se ha ejecutado Vitest, el chequeo TypeScript de toda la aplicación ni la compilación completa porque las dependencias no están instaladas. Tampoco se ha probado contra una base de datos de prueba ni se han aplicado migraciones a la base real. No publicar esta copia todavía.
