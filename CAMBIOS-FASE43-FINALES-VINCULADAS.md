# Fase 43 — Vinculación de finales con partidos oficiales

## Cambios
- Añadidas referencias opcionales a partidos oficiales para finales a partido único y para cada partido de una eliminatoria a ida y vuelta.
- El formulario administrativo permite seleccionar partidos completados de la misma temporada y competición.
- La API vuelve a comprobar la temporada, competición, marcador final y correspondencia de clubes antes de guardar.
- Los marcadores enlazados se obtienen del partido oficial y se expresan desde la perspectiva de campeón/subcampeón. La validación existente comprueba que el campeón coincida con el marcador global o con la tanda registrada.
- Los registros sin partido asociado siguen siendo válidos para documentar temporadas históricas incompletas.
- La ficha de palmarés del club muestra sus finales oficiales registradas.
- Migración aditiva con claves foráneas; no elimina ni reescribe los registros existentes.

## Verificación
Se incluyen auditorías estáticas de enlace y de migraciones. No se afirma que la migración se haya aplicado a una base de datos real. Las pruebas completas de producción, Vitest, typecheck, ESLint y PostgreSQL requieren instalar dependencias y disponer de la base de datos de prueba.
