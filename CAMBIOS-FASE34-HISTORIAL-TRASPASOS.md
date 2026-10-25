# Fase 34 — Historial consultable de traspasos

## Cambios
- Se añadió `market_transfer_history`, con referencias a la propuesta, temporada, jugador y equipos de origen/destino.
- La aceptación de un traspaso escribe el cambio de plantilla, el historial y el estado de la propuesta dentro de la misma transacción.
- La API GET expone el historial y el mercado lo muestra filtrado por la temporada seleccionada, con fecha, equipos y nota.
- La migración rellena el historial de las propuestas que ya estaban aceptadas antes de esta fase, usando `updated_at` como fecha disponible.
- Se añadió `scripts/verify-transfer-history.mjs` y se incorporó al flujo de verificación de release.

## Límites de verificación
Las auditorías ejecutadas son estáticas. No se ejecutaron Vitest, TypeScript, ESLint, build ni integración real con PostgreSQL/navegador porque las dependencias no están instaladas en este entorno. La migración no se ha aplicado a ninguna base de datos real.

## Publicación
No se desplegó a Netlify ni se modificó producción. El ZIP es una entrega de desarrollo independiente.
