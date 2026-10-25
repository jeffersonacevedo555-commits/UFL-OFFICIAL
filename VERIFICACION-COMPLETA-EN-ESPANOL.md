# UFL — verificación completa antes de publicar

## Para qué sirve

El comando `pnpm run verify:complete` ejecuta en secuencia las auditorías estáticas existentes (torneo, migraciones, concurrencia y configuración Netlify), las pruebas automatizadas, el chequeo TypeScript, ESLint y la compilación de producción. No publica nada y no ejecuta migraciones ni modifica la base de datos.

El verificador intenta completar todas las etapas aunque una falle, y al final presenta un resumen. Si falta la carpeta `node_modules`, informa que las etapas que dependen de las herramientas del proyecto siguen pendientes.

## Requisitos

- Node.js compatible con el proyecto: `package.json` declara `^22.13.0 || ^24.0.0 || >=26.0.0`.
- pnpm y conexión al registro de paquetes para instalar las dependencias si no están instaladas.

## Ejecutar

Desde la carpeta del proyecto:

```bash
pnpm install --frozen-lockfile
pnpm run verify:complete
```

## Qué no hace

- No publica ni despliega el sitio.
- No conecta automáticamente con producción.
- No ejecuta migraciones SQL.
- No demuestra por sí solo que los datos reales se conservarán.

Antes de publicar, las migraciones deben ejecutarse y validarse contra una base de datos de prueba separada, con una copia protegida de los datos pertinentes. Nunca pruebes migraciones nuevas directamente en la base de datos de producción.


## Nuevo en la fase 19: informe guardado

Al ejecutar `npm run verify:complete` o `pnpm run verify:complete`, el proceso guarda un informe legible y otro en JSON en la carpeta `reports/`:

- `reports/verification-latest.md` — resumen sencillo para revisar.
- `reports/verification-latest.json` — resultados estructurados para diagnóstico técnico.

El informe distingue entre comprobaciones correctas, fallidas y pendientes por falta de dependencias. No contiene credenciales ni publica la web. La carpeta y ambos informes se excluyen de Git mediante `.gitignore`.
