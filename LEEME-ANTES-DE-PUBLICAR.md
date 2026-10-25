UFL — COPIA DE TRABAJO, NO PUBLICAR TODAVÍA

Esta entrega incorpora lógica de temporadas, creación inicial de Copa, funciones de Supercopas y registro de penaltis para las vueltas eliminatorias.

Antes de publicar hay que:
1. Aplicar y comprobar las migraciones SQL en una base de datos de prueba, incluida `20261022071000_add_penalty_scores`.
2. Instalar dependencias y ejecutar las pruebas Vitest, el chequeo TypeScript completo y la compilación de producción.
3. Probar las acciones del panel de administración y comprobar que los datos históricos permanecen intactos.
4. Probar en una base de datos de prueba la progresión de Copa (octavos → cuartos → semifinal → final). La acción ya está conectada al panel, pero falta validarla con una aplicación compilada.
5. Probar en una base de datos de prueba la generación de semifinales y final de Supercopa de Liga, y la final de Supercopa de Europa. Estas acciones ya están conectadas al panel, pero requieren pruebas integrales antes de publicar.

No subas esta copia a Netlify ni la uses para sustituir la web publicada. La base de datos real no se ha modificado.

6. Esta fase añade `npm run verify:tournament`, una verificación manual sin Vitest para comprobar la progresión completa de Copa, la resolución de eliminatorias y la generación de Supercopas. Requiere Node.js compatible con el proyecto (Node 22.13 o superior); la opción de Node para quitar tipos de TypeScript aún puede mostrar un aviso experimental.
7. Esta fase refuerza la progresión de Copa para rechazar equipos duplicados en rondas y cruces sin vuelta correspondiente. También impide aceptar penaltis si el marcador global ya tiene ganador. Las verificaciones aisladas pasaron, pero siguen pendientes las pruebas integrales de aplicación y base de datos.
8. Esta fase conserva el cuadro de Copa entre rondas: los ganadores de octavos avanzan a cuartos siguiendo los lados previstos del cuadro, en vez de emparejarse solo por orden de guardado. Se añadió una comprobación específica y pasó `npm run verify:tournament`. Sigue pendiente ejecutar Vitest y compilar la aplicación completa.


## Fase 9 — integridad de marcadores

Se añadió la migración `20261022073000_enforce_match_score_integrity`. Esta crea restricciones en PostgreSQL para impedir resultados con solo un marcador, valores negativos o superiores a 99, y tandas de penaltis fuera de una vuelta válida de eliminación directa. La migración debe revisarse y probarse en un entorno de prueba antes de aplicarse a la base de datos de producción. No se ha ejecutado sobre la base de datos real.

La verificación independiente se ejecuta con `npm run verify:tournament` en Node.js compatible. Las pruebas completas de la aplicación y la compilación siguen pendientes.


## Fase 10 — integridad al editar resultados

Consulta `CAMBIOS-FASE10-RESULTADOS.md`. Esta actualización evita que modificar una ida deje una tanda de penaltis ya guardada en la vuelta con un global incompatible. La comprobación se ejecuta en el servidor dentro de la transacción de guardado. La aplicación completa y las migraciones siguen pendientes de validación en un entorno de prueba; no publiques este paquete todavía.

## Fase 11 — concurrencia

Los guardados de resultados ahora usan el mismo bloqueo asesor transaccional que las operaciones de generación y cambio de temporada, evitando que dos peticiones sobre ida/vuelta o una generación de ronda se validen simultáneamente contra estados distintos. Se corrigió también el resumen de cantidad de comprobaciones del script manual.

Antes de publicar, sigue siendo obligatorio ejecutar las pruebas integrales, la compilación y las migraciones en una base de datos de prueba. Esta copia no debe subirse directamente a producción.

## Fase 12 — diagnóstico previo de migración

La migración de integridad de marcadores ahora revisa los registros existentes antes de añadir restricciones. Si encuentra resultados o tandas de penaltis incompatibles, se detiene e informa los IDs de los partidos que necesitan revisión. La revisión no cambia ni elimina esos datos. Esta mejora reduce el riesgo de tener un fallo de migración difícil de diagnosticar, pero no sustituye una prueba en una base de datos de prueba.


## Fase 13 — auditoría estática de migraciones

Se añadió `npm run verify:migrations` para revisar automáticamente el orden y ciertos requisitos importantes de las migraciones de temporadas, penaltis e integridad. En esta copia pasó la auditoría estática de 14 comprobaciones y también pasaron las 11 comprobaciones manuales del torneo. Estas verificaciones no sustituyen ejecutar las migraciones contra PostgreSQL. La instalación de dependencias, Vitest, TypeScript y la compilación completa continúan pendientes; no publiques esta copia todavía.

## Fase 16: creación de partidos y cambio de temporada

La creación manual de partidos ahora usa una transacción y el mismo bloqueo que el cambio de temporada. Para ejecutar las comprobaciones estáticas disponibles, con las dependencias instaladas, usa `npm run verify:release`. Esto no sustituye la compilación, las pruebas automatizadas ni una prueba con PostgreSQL. No publiques hasta completar esas verificaciones.


## Fase 18 — auditoría previa de Netlify

Se añadió `npm run verify:netlify` y se integró en `npm run verify:release`. La auditoría revisa la configuración de compilación/publicación, la existencia de scripts necesarios, los nombres y archivos SQL de las migraciones y las exclusiones de archivos de entorno en `.gitignore`. En la copia de desarrollo, las auditorías estáticas suman 42 comprobaciones correctas. No equivalen a una compilación completa ni a ejecutar migraciones en PostgreSQL.

La comprobación `npm run verify:complete` se ejecutó y marcó como pendientes Vitest, TypeScript, ESLint y compilación por falta de dependencias locales. La instalación no pudo completarse porque el registro de paquetes respondió `EAI_AGAIN`. No publicar esta copia hasta resolverlo y ejecutar pruebas integrales en una base de datos de prueba.

## Fase 20 — diagnóstico del entorno

Se añadió `npm run verify:environment` para comprobar la versión de Node.js, detectar el archivo de bloqueo, avisar si se está usando un gestor distinto al esperado y señalar si faltan dependencias locales. El proyecto contiene `pnpm-lock.yaml`, por lo que para instalaciones reproducibles se debe usar `pnpm install --frozen-lockfile` y después `pnpm run verify:complete`. En esta sesión no fue posible descargar pnpm porque el registro de npm devolvió `EAI_AGAIN`; Vitest, TypeScript, ESLint y la compilación permanecen pendientes. No publicar hasta ejecutar estas pruebas y validar las migraciones en una base de datos de prueba.


## Fase 21 — comprobaciones como puerta de publicación

La configuración `netlify.toml` se cambió para que Netlify ejecute `pnpm run verify:complete` antes de completar el build. Este comando corre auditorías estáticas, Vitest, TypeScript, ESLint y la compilación. Si una comprobación no puede ejecutarse o falla, la publicación debe detenerse. La auditoría estática de Netlify verifica que esta configuración permanezca activa.

Antes de usarlo en producción, confirma en un deploy de prueba que Netlify detecta `pnpm-lock.yaml` e instala dependencias correctamente. Este control no sustituye la prueba de las migraciones contra una base PostgreSQL de prueba ni hace cambios en la base de datos real.

## Fase 22 — auditoría de seguridad previa a publicar

Se añadió `npm run verify:deployment-safety`, integrado en las auditorías de lanzamiento. Revisa la puerta de verificación de Netlify, el directorio de publicación, la presencia del lockfile, las exclusiones de archivos locales y operaciones SQL destructivas comunes. Es una revisión estática, no ejecuta SQL ni sustituye una copia de seguridad ni una prueba en PostgreSQL. Antes de publicar, instalar dependencias con `pnpm install --frozen-lockfile`, ejecutar `pnpm run verify:complete` y probar las migraciones en una base de datos de prueba separada.

## Fase 23 — versión de pruebas independiente

Consulta `CAMBIOS-FASE23-VERSION-DE-PRUEBAS.md`. Las dependencias se instalaron con el lockfile. Se añadieron el árbol de rutas generado y el snapshot de Drizzle que faltaban, se corrigió la sustitución de plazas de la Supercopa de Liga y se resolvieron dos causas previsibles de fallo de ESLint. El proyecto se despliega en un sitio de Netlify de pruebas con su propia base de datos e Identity, separado de la web publicada. Antes de publicar hay que revisar el log de ese deploy y recorrer el panel con un administrador de prueba.
