# Fase 46 — Auditoría administrativa de finales históricas

## Objetivo

Registrar de forma transaccional las creaciones, ediciones y eliminaciones de finales históricas, conservando quién realizó el cambio cuando la identidad del administrador está disponible y las instantáneas anterior y posterior.

## Cambios

- Se añadió la tabla `historical_final_audits` al esquema Drizzle.
- Se añadió la migración `20261023062000_historical_final_audit`.
- Crear, editar y eliminar una final genera un evento de auditoría dentro de la misma transacción de base de datos.
- Los eventos sobreviven a la eliminación del registro de final; por diseño, `final_id` no tiene clave foránea.
- La API solo devuelve los eventos de auditoría a usuarios con rol `admin`.
- Se añadió la pestaña administrativa «Auditoría administrativa», con filtros por acción, búsqueda y exportación CSV.
- Se añadió `scripts/verify-historical-audit.mjs` y se integró en `verify:release`.

## Alcance y límites

- La auditoría cubre las operaciones de finales históricas que pasan por la API de la aplicación desde que se instala esta fase.
- No reconstruye modificaciones anteriores ni captura escrituras directas a la base de datos o cambios en otras áreas (partidos, plantillas o mercado).
- Los eventos anteriores no se inventan. La migración crea la tabla vacía y no altera las finales existentes.
- La lectura está limitada a los últimos 500 eventos, ordenados del más reciente al más antiguo.
- La migración debe aplicarse antes de desplegar esta versión.

## Verificaciones ejecutadas

- `npm run verify:release`: correcto; auditoría nueva 9/9 y las auditorías estáticas anteriores incluidas en la suite finalizaron sin errores.
- Transpilación sintáctica con TypeScript global de `src/routes/index.tsx`, `db/schema.ts` y `netlify/functions/tournament.mts`: correcta.
- `node scripts/verify-migrations.mjs`: correcto, incluida la nueva migración.
- Integridad del ZIP: comprobada por separado.

## No ejecutado

No se ejecutaron Vitest, el chequeo integral de tipos, ESLint, compilación de producción ni pruebas de integración con PostgreSQL; faltan las dependencias locales (`node_modules`). No se aplicó la migración ni se desplegó el proyecto.
