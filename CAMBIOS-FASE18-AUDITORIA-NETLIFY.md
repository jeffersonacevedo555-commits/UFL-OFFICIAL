# Fase 18 — auditoría previa de Netlify

Se añadió `npm run verify:netlify`, una comprobación estática previa a la publicación. Revisa que `netlify.toml` apunte al comando de compilación y directorio de salida esperados, que estén definidos los comandos de verificación, que las migraciones tengan nombres admitidos y archivos SQL no vacíos, y que `.gitignore` excluya los archivos de entorno y el estado local de Netlify.

Se amplió `verify:release` para incluir esta auditoría. En este entorno pasó: 11 comprobaciones de torneo, 14 de migraciones, 8 de concurrencia y 9 de configuración Netlify (42 comprobaciones en total).

También se amplió `.gitignore` para excluir variantes de archivos `.env`, manteniendo la excepción para `.env.example`.

Limitaciones: la auditoría es estática. No verifica credenciales, permisos de la cuenta, cuotas de Netlify, ejecución de SQL, compilación ni comportamiento de la aplicación publicada. La verificación completa continúa marcando como pendientes Vitest, TypeScript, ESLint y la compilación porque no están instaladas las dependencias; la conexión al registro npm falla con `EAI_AGAIN`. No publicar hasta completar esas pruebas y probar migraciones en una base PostgreSQL aislada.
