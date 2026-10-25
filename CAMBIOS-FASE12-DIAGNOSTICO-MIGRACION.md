# UFL — Fase 12: diagnóstico previo de migración

## Qué cambia

- Antes de crear las restricciones nuevas de marcadores y penaltis, la migración revisa si hay registros antiguos que no cumplirían las reglas.
- Si encuentra alguno, la migración se detiene con los IDs de los partidos y una indicación de qué revisar.
- La revisión no actualiza, borra ni corrige automáticamente los registros.

## Por qué

Si la base de datos ya contiene un resultado incompleto, un marcador fuera del rango 0–99 o una tanda de penaltis guardada en un partido no válido, PostgreSQL rechazaría la nueva restricción. El diagnóstico previo hace más claro qué registros revisar en un entorno de prueba antes de plantear cualquier publicación.

## Validación pendiente

Esta migración todavía debe ejecutarse en una base de datos PostgreSQL de prueba. No se ha ejecutado contra la base de datos real. La compilación completa, Vitest y el chequeo TypeScript siguen pendientes porque las dependencias del proyecto aún no están instaladas en este entorno. No publiques esta copia todavía.
