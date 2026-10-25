# Fase 3 — lógica de Supercopa de la Liga

## Implementado en esta copia de trabajo

- Añadido un resolvedor de las cuatro plazas de la Supercopa de la Liga que evita duplicar equipos.
- El resolvedor respeta el orden de sustitución proporcionado por cada competición. Para usarlo correctamente, las listas deben incluir el titular y los siguientes puestos elegibles en orden, omitiendo los finalistas que no correspondan a esa plaza si la regla de sustitución lo exige.
- Añadida la generación de las dos semifinales a ida y vuelta: campeón de Liga contra subcampeón de Copa y subcampeón de Liga contra campeón de Copa.
- Añadida la generación de la final a ida y vuelta cuando se conozcan los ganadores de ambas semifinales.
- Añadidas pruebas Vitest para cruces, sustituciones, entradas inválidas y la final.

## Verificación realizada

- `tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext src/lib/tournament.ts`: correcto.
- Ejecutadas siete comprobaciones directas con Node.js sobre la generación de semifinales, final, sustituciones y funciones existentes: todas superadas.
- No se pudo ejecutar Vitest ni compilar la aplicación completa porque las dependencias del proyecto no están instaladas y la instalación completa no ha terminado correctamente en este entorno.

## Limitación importante

Esta fase implementa y prueba la lógica reutilizable, pero todavía **no conecta la Supercopa de la Liga al panel de administración ni a la base de datos**. Aún no calcula automáticamente los campeones/subcampeones de Copa desde el cuadro, ni genera la final automáticamente al concluir las semifinales. No publicar esta copia.

## Lógica adicional de eliminatorias

- Añadida `resolveTwoLegTie`, que calcula el marcador global de ida y vuelta.
- Si el global está empatado, no asigna un ganador por diferencia de goles ni por orden de equipos: exige una tanda de penaltis con resultado válido en el partido de vuelta.
- Añadidas pruebas para ganador por global, ganador por penaltis y errores por tanda ausente/empatada.
- La resolución automática del ganador aún no alimenta la siguiente ronda de forma automática; el registro de penaltis sí quedó conectado al editor y a la API, sujeto a aplicar la migración.


### Registro de penaltis en la vuelta
- Se añadieron columnas opcionales para los marcadores de penaltis de ambos equipos, con una migración SQL separada.
- El formulario de administración muestra los campos de penaltis en partidos de vuelta de competiciones eliminatorias.
- La API solo acepta penaltis cuando existe una ida finalizada con los equipos invertidos y el global queda empatado; los penaltis deben tener ambos valores y un ganador.
- La migración `20261022071000_add_penalty_scores` todavía debe ejecutarse en el entorno de base de datos antes de desplegar esta versión.


## Fase adicional — progresión automática de la Copa

- Conectada la acción `generateNextCupRound` al endpoint de administración y al panel.
- Al terminar una ronda, la acción calcula los ganadores por marcador global o por penaltis y genera los cruces de la siguiente ronda a ida y vuelta.
- La progresión cubre octavos → cuartos → semifinal → final; no permite generar otra ronda después de la final ni duplicar una ronda existente.
- Añadidas pruebas para el avance a cuartos, la protección ante partidos pendientes y la resolución por penaltis.
- Se eliminó una doble recarga innecesaria de los datos después de guardar cambios.

Esta mejora no significa que la aplicación completa esté validada: la generación automática de finales de Supercopa sigue pendiente y no se deben publicar todavía estos cambios.
