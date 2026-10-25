# Fase 31 — Mercado de jugadores: propuestas seguras

## Cambios
- Añade `market_proposals` y una migración aditiva; no elimina ni reescribe datos existentes.
- Expone las propuestas por temporada en el endpoint del torneo.
- Añade acciones de administración para registrar una propuesta y retirar una propuesta pendiente.
- Valida temporada, jugador, equipo de destino, equipos distintos y duplicados pendientes.
- Incorpora la pestaña Mercado con formulario administrativo y lista pública de propuestas.
- Las propuestas no cambian la afiliación del jugador. Esto es intencional: el modelo actual no guarda plantillas por temporada, y mover directamente `players.team_id` podría reinterpretar estadísticas históricas al editar partidos anteriores. La aplicación real de traspasos queda pendiente de implementar plantillas por temporada.

## Validación
- Auditoría estática de migraciones, configuración de Netlify, seguridad de publicación, torneos y concurrencia.
- No se considera validación de PostgreSQL real, compilación o pruebas de navegador.

## Publicación
- No desplegado. No se ha modificado producción.
