# Cambios de la fase 49: expediente cronológico del jugador

## Objetivo

Reunir en la ficha individual una cronología de la trayectoria deportiva y de los eventos administrativos disponibles, sin fusionar ni confundir las fuentes originales.

## Cambios

- La ficha de jugadores recibe los eventos de auditoría administrativa que ya expone el API.
- Se combinan las asignaciones de plantilla, los traspasos registrados y los eventos administrativos relacionados con el jugador.
- Los eventos se ordenan cronológicamente en orden descendente y muestran categoría, descripción y fecha.
- Se incluyen cambios de ficha, plantilla y propuestas de mercado cuando sus snapshots permiten relacionarlos con el jugador.
- La interfaz comunica que los eventos anteriores a la activación de la auditoría no se reconstruyen.
- Se añadieron estilos adaptables y una auditoría estática `verify-player-dossier.mjs`.

## Datos y límites

No se añade una migración ni se modifican las rutas de escritura. El expediente usa asignaciones, traspasos y eventos de auditoría ya disponibles en la respuesta de torneo. La auditoría administrativa puede no estar disponible para usuarios no administradores; en ese caso la cronología sigue mostrando las asignaciones y los traspasos accesibles.

## Verificación

La verificación de esta fase comprueba estáticamente el cableado, las fuentes de eventos, el orden cronológico, el estado vacío y los estilos. Estas comprobaciones no sustituyen Vitest, typecheck completo, ESLint, build, pruebas de navegador o integración PostgreSQL.
