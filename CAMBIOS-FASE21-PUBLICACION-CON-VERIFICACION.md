# Fase 21 — bloquear publicaciones si las verificaciones no pasan

## Cambio

`netlify.toml` usa ahora `pnpm run verify:complete` como comando de compilación. Netlify no continuará la publicación si fallan las auditorías estáticas, las pruebas Vitest, el chequeo TypeScript, ESLint o la compilación.

La auditoría `verify:netlify` comprueba que este comando preventivo siga configurado. Se mantiene `publish = "dist/client"`.

## Límites importantes

- El comando no ejecuta migraciones manualmente ni prueba PostgreSQL.
- Un despliegue que falle durante las verificaciones debe detenerse antes de publicar el artefacto nuevo.
- Esta configuración debe probarse en una rama de despliegue preliminar de Netlify antes de confiar en ella para producción.
- No se cambió la base de datos ni se publicó el sitio en esta fase.

## Verificación local

Con las dependencias instaladas usando el archivo de bloqueo (`pnpm install --frozen-lockfile`), se puede ejecutar `pnpm run verify:complete`. Si alguna prueba falla o falta una dependencia, la publicación debe considerarse bloqueada.


## Ajuste adicional del verificador

Cuando no están instaladas las dependencias, `verify:complete` ejecuta directamente las auditorías estáticas con Node.js en vez de intentar invocar pnpm para ese bloque. Así el informe distingue entre auditorías estáticas ejecutables y pruebas que realmente requieren `node_modules`.
