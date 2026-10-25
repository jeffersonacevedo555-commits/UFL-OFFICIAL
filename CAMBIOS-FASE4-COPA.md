# Fase 4 — Copa y clasificación por eliminatorias

- La administración puede generar octavos de Copa desde la clasificación final de la temporada anterior.
- La administración puede avanzar de octavos a cuartos, semifinales y final después de completar todos los partidos de la ronda vigente.
- La resolución usa el marcador global de ida y vuelta y exige penaltis válidos si el global queda empatado.
- Se bloquea la generación de rondas duplicadas.
- Se añadieron campos para registrar los penaltis en los partidos de vuelta y una migración SQL independiente.

## Validación pendiente

La lógica aislada se probó manualmente con Node.js. La aplicación completa no se ha compilado ni probado con Vitest porque las dependencias no están instaladas en este entorno. La progresión debe verificarse en una base de datos de prueba antes de publicar.
