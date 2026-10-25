# Fase 44 — Panel de integridad histórica

## Alcance
- Añade la pestaña «Integridad histórica» como auditoría de solo lectura.
- Detecta competiciones/temporadas sin registro de campeón, sin asumir que la competición necesariamente se disputó.
- Señala finales manuales sin partidos vinculados para revisión, sin tratarlas automáticamente como inválidas.
- Revisa referencias a partidos inexistentes, sin resultado, con temporada/competición/ronda incorrecta o con clubes distintos.
- Compara los marcadores guardados en la final con los marcadores actuales de los partidos vinculados.
- Revisa eliminatorias de ida y vuelta, consistencia del campeón y uso de penaltis.
- Incluye filtros por temporada, competición y severidad; estilos adaptables a móviles.

## Seguridad e integridad
- Panel de solo lectura; no añade endpoints ni modifica automáticamente los datos.
- No se añadió migración de base de datos.
- Las advertencias de temporadas sin registro requieren revisión humana: no prueban que una competición se haya disputado.

## Verificación
- `node scripts/verify-historical-integrity.mjs`
- Suite estática `npm run verify:release` (si las dependencias y requisitos del entorno están disponibles).
- No se publica ni se cambia producción desde esta fase.
