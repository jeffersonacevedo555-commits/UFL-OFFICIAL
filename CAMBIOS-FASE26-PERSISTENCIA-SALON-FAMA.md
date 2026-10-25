# UFL — Fase 26: Persistencia del Salón de la Fama

## Cambios realizados

- Se añadió `hall_of_fame` al esquema Drizzle para guardar un registro por temporada.
- Se añadió una migración SQL no destructiva y su snapshot de Drizzle.
- Se guarda una instantánea JSON de premios por temporada, la selección manual del Balón de Oro, once titulares, siete suplentes y fecha de actualización.
- La API pública devuelve los registros históricos guardados.
- Se añadió la acción administrativa `saveHallOfFame`, protegida por la comprobación de rol `admin` ya existente.
- El servidor valida la temporada, que haya 11 titulares y 7 suplentes, que sean 18 jugadores distintos y que todos los jugadores seleccionados existan.
- La migración es aditiva: no elimina ni modifica tablas existentes.
- Se ampliaron las verificaciones estáticas de migraciones para incluir esta tabla.

## Límites actuales

- La interfaz pública del Salón de la Fama y el formulario administrativo aún no están conectados.
- `awards` es una instantánea enviada por la capa administrativa; el cálculo automático de todos los campeones y la captura inmutable de esos resultados todavía deben integrarse en el servidor.
- La migración no se ha ejecutado en PostgreSQL real.
- No se han ejecutado Vitest, TypeScript ni la compilación completa porque las dependencias no están instaladas en este entorno.
- El snapshot se añadió siguiendo el formato de snapshots de la versión de Drizzle incluida, pero debe verificarse con `drizzle-kit` antes de aplicar la migración en Netlify.

## Seguridad y publicación

No se ha desplegado ni conectado este código a la web original. No ejecutar la migración en producción. Validar primero en el proyecto de pruebas independiente.
