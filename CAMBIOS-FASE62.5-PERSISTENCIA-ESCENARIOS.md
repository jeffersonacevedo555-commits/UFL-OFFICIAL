# Fase 62.5 — Persistencia y consistencia de escenarios

## Cambios incluidos

- Los escenarios guardados se persisten en `localStorage`, separados por temporada con la clave `ufl-saved-scenarios:<seasonId>`.
- Se recuperan los escenarios al seleccionar una temporada y se evita guardar datos durante el render intermedio de cambio de temporada.
- El límite es de ocho escenarios por temporada; al guardar el noveno, se conserva la lista más reciente de ocho (FIFO).
- Se validan los campos principales, las predicciones y las filas de clasificación al cargar. Los registros inválidos se filtran individualmente.
- JSON corrupto se gestiona de forma segura y se intenta limpiar la clave dañada. Los errores de lectura/escritura se capturan; el guardado devuelve `false` cuando falla.
- Se añadió exportación/importación de paquetes JSON por temporada, con validación de esquema, límite de archivo de 2 MB, filtrado de registros inválidos, omisión de duplicados y límite FIFO.
- Se añadió `scripts/verify-classification-scenario-persistence.mjs` y se conectó a `verify:release`.

## Verificación ejecutada

- Pruebas funcionales de persistencia e intercambio JSON: 10/10 aprobadas.
- Auditoría de escenarios guardados: 12/12 aprobada.
- Auditorías estáticas `verify-classification-*.mjs`: aprobadas.
- No se ejecutaron build ni la suite Vitest porque esta copia no incluye `node_modules`. Se intentó `tsc --noEmit`, pero no pudo arrancar porque falta la definición `vite/client` que aporta esa dependencia.

## Alcance y limitaciones

Esta entrega se construyó sobre el archivo disponible `UFL-fase60-centro-comparativo-escenarios.zip`. Como el ZIP de origen no contenía los cambios de la Fase 61 descritos en la conversación, se incorporó en esta entrega una implementación de exportación/importación JSON por temporada junto con la persistencia. La persistencia se guarda únicamente en el navegador del usuario y no se sincroniza con otros dispositivos ni con el servidor.
