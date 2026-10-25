# Fase 20 — diagnóstico del entorno de desarrollo

Se añadió `scripts/verify-environment.mjs` y el comando `verify:environment` para detectar problemas de preparación antes de intentar pruebas completas. La herramienta comprueba que `package.json` sea válido, identifica el archivo de bloqueo, avisa si el comando actual no coincide con el gestor declarado por el lockfile, revisa la versión de Node.js, confirma que existan los scripts necesarios y detecta si falta `node_modules`. También advierte de la presencia de archivos `.env` sin leer ni mostrar sus contenidos.

La auditoría se incorporó a `verify:release`. Se ajustó `verify-complete.mjs` para informar por separado el gestor usado al ejecutar el comando y el gestor sugerido por el archivo de bloqueo, y para indicar el comando de instalación correspondiente.

## Resultado de esta copia

- Diagnóstico de entorno: correcto; identifica `pnpm-lock.yaml` como archivo de bloqueo y Node.js 22.16.0 como compatible.
- Auditoría de torneo: 11 comprobaciones correctas.
- Auditoría estática de migraciones: 13 comprobaciones correctas.
- Auditoría estática de concurrencia: 8 comprobaciones correctas.
- Auditoría estática de Netlify: correcta.
- Pruebas Vitest, TypeScript, ESLint y compilación: pendientes porque no existe `node_modules`.
- La descarga de pnpm por Corepack falló por `EAI_AGAIN` al acceder a `registry.npmjs.org`; no fue posible instalar las dependencias en este entorno.

Esta herramienta es de diagnóstico local. No despliega el sitio, no accede a la cuenta de Netlify, no lee valores de archivos de entorno y no ejecuta migraciones en PostgreSQL.
