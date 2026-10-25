# Fase 22 — auditoría de seguridad previa a publicar

Se añadió `npm run verify:deployment-safety` y se integró en `verify:release` y `verify:complete`. La auditoría comprueba que Netlify exija la verificación completa, que publique `dist/client`, que el flujo completo incluya el build, que exista el archivo de bloqueo de pnpm, que los archivos locales sensibles estén excluidos y que las migraciones no contengan algunas operaciones destructivas comunes (`DROP TABLE`, `TRUNCATE` o `DELETE FROM` sin `WHERE`).

La auditoría es estática y no puede demostrar que una migración sea segura en todos los casos ni que el sitio compile. No ejecuta SQL ni cambia datos.

## Antes de publicar

1. Crear una copia de seguridad de la base de datos desde el panel de Netlify o el proveedor de base de datos disponible.
2. Probar todas las migraciones en una base de datos de prueba separada, con una copia representativa de los datos.
3. Ejecutar `pnpm install --frozen-lockfile` y después `pnpm run verify:complete` en un entorno con conexión.
4. Confirmar que Vitest, TypeScript, ESLint y `vite build` pasan.
5. Revisar el deploy de prueba y solo entonces decidir si se publica.

No aplicar manualmente las migraciones a la base de datos de producción como forma de probarlas. Esta copia de desarrollo no está certificada para producción.
