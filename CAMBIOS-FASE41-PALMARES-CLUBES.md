# Fase 41 — Palmarés histórico de clubes

## Cambios
- Añadida la pestaña pública «Palmarés de clubes».
- El ranking reúne títulos históricos guardados por temporada para Liga, Copa, Champions League, Europa League y las dos Supercopas.
- Incluye filtro por temporada, competición y club; conteo de títulos, subcampeonatos de Liga y desglose histórico por club.
- Los registros se derivan exclusivamente de `hallOfFame.awards`. No se infieren títulos desde la clasificación ni se inventan subcampeones de eliminatorias.
- Se preservan los nombres históricos exactamente como se guardaron; si un club cambió de nombre, el sistema no adivina equivalencias.
- Añadidos estilos adaptables y una auditoría estática integrada en `verify:release`.

## Limitaciones conocidas
El modelo actual solo guarda explícitamente el subcampeón de Liga. No hay datos suficientes para listar subcampeones de cada competición eliminatoria o todas las finales disputadas. La vista explica esta limitación y no genera esos registros.

## Seguridad y publicación
No se añadió migración ni se modificó la base de datos. No se publicó el proyecto ni se alteró el sitio de producción.
