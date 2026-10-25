# UFL — Fase 35: fichas de jugadores e historial individual

## Cambios
- Se añadió la pestaña **Jugadores** a la navegación principal.
- Se incorporó una búsqueda por nombre para encontrar jugadores existentes.
- La ficha presenta el equipo del jugador en la temporada seleccionada, utilizando `player_season_rosters` como fuente de verdad.
- Se muestran las asignaciones del jugador por temporada y los traspasos registrados para ese jugador, ordenados del más reciente al más antiguo.
- Cada traspaso muestra los equipos de origen y destino, la temporada, la fecha registrada y la nota de la propuesta cuando existe.
- Se añadieron estilos adaptables a pantallas pequeñas.
- No se añade migración ni se cambian datos: se reutilizan los datos que la API ya entrega.

## Verificación realizada
- Auditoría estática de fichas: 10/10.
- Verificaciones de torneos: 11/11.
- Auditoría estática de decisiones de mercado: 10/10.
- Auditoría estática de historial: 12/12.
- Auditoría de mercado: 11/11.
- Auditoría de plantillas por temporada: 10/10.
- Auditoría de concurrencia: 8/8.
- Auditorías de migraciones, Netlify y seguridad previa a publicar: correctas.
- Diagnóstico: Node.js cumple el requisito, pero no existe `node_modules`; por tanto no se ejecutaron Vitest, typecheck completo, ESLint, build ni pruebas de navegador/PostgreSQL.

## Límites
El historial mostrado es el que existe en `market_transfer_history`; no reconstruye operaciones que nunca se registraron. La ficha no permite editar jugadores ni ejecutar traspasos.

## Seguridad de publicación
No se ejecutó ningún despliegue ni se modificó el sitio de producción. Esta entrega es un ZIP independiente.
