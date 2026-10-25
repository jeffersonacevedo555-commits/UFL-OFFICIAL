# Fase 17 — herramienta de verificación completa

Se agregó `npm run verify:complete` (o `pnpm run verify:complete`) para ejecutar las auditorías estáticas, las pruebas automatizadas, TypeScript, ESLint y la compilación de producción.

La herramienta:
- Comprueba la versión de Node.js declarada por el proyecto.
- Ejecuta las auditorías que no requieren dependencias instaladas.
- Si no existe `node_modules`, deja explícitas las etapas pendientes en vez de intentar ejecutar comandos que no están disponibles.
- Si las dependencias están instaladas, ejecuta Vitest, TypeScript, ESLint y Vite sin detenerse en el primer error.
- Al final resume qué pasó y qué falta.
- No despliega la aplicación, no modifica la base de datos y no ejecuta migraciones.

En la fase 17, `npm run verify:release` pasó 33 comprobaciones estáticas. En la fase 18 se añadieron 9 comprobaciones de configuración de Netlify, para un total actual de 42 comprobaciones estáticas. Las pruebas completas, TypeScript, ESLint y compilación no se pudieron validar porque no hay dependencias locales instaladas. El chequeo TypeScript global también indicó que falta `vite/client`, consistente con la ausencia de las dependencias del proyecto.

Próximo paso técnico: en un entorno con acceso al registro de paquetes, ejecutar `pnpm install --frozen-lockfile` y después `pnpm run verify:complete`. Posteriormente todavía hará falta probar las migraciones en una base de datos PostgreSQL de prueba. No publicar hasta completar ambas validaciones.
