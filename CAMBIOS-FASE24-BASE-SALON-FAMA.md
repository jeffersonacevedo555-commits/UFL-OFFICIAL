# UFL — Fase 24 (base técnica del Salón de la Fama)

## Cambios incluidos
- Añadido `.gitignore` para excluir `.env`, variantes de entorno, `.netlify/`, dependencias y compilaciones locales. Esto corrige la ausencia de `.gitignore` que hacía fallar las auditorías estáticas de seguridad de publicación.
- Añadido `src/lib/hall-of-fame.ts` con funciones puras para calcular podio de Liga, campeón de una final a ida y vuelta y Bota de Oro.
- Añadidas pruebas Vitest en `src/lib/hall-of-fame.test.ts` para temporada incompleta, clasificación completa, final sin resultados, marcador global y empate en goles.

## Reglas explícitas de esta primera base
- La Liga solo produce podio si hay 24 equipos y cada uno tiene 23 partidos jugados.
- La clasificación ordena por puntos, diferencia de goles y goles a favor. Si persiste un empate que afecta a los dos primeros puestos, no se asigna el podio automáticamente.
- Las finales a ida y vuelta requieren ambos marcadores. Si el global empata, se requieren penaltis válidos registrados en la vuelta.
- La Bota de Oro suma los goles de las estadísticas recibidas por jugador y comparte el premio cuando hay empate en el máximo. El nombre solo ordena la presentación, no desempata el premio.

## Alcance y limitaciones
Esta fase añade la base de cálculo, no la función completa. Todavía faltan persistencia por temporada, API protegida para edición administrativa, interfaz pública y administrativa, y la integración real de estadísticas con partidos/temporadas. No se han añadido migraciones de base de datos en esta fase.

## Seguridad
No se ha ejecutado ninguna migración, no se han usado credenciales y no se ha desplegado nada en Netlify. La web original y su base de datos no se han tocado.
