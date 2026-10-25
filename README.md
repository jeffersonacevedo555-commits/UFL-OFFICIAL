# Universe Family League

Web en español para un torneo comunitario de FC Mobile. Incluye clasificación de liga, calendario, resultados, equipos y las reglas de acceso a Champions, Europa League y Copa, con diseño adaptable a móviles.

El panel de administración permite registrar y editar hasta 24 equipos, generar un calendario de liga de una vuelta (23 jornadas), publicar cruces de las otras competiciones y actualizar fechas y marcadores. La clasificación utiliza 3 puntos por victoria y 1 por empate; desempata por diferencia de goles, mini-tabla de enfrentamientos directos, goles a favor y menos goles en contra. Si persiste un empate deportivo completo, la generación de Copa y Supercopa se detiene para que la organización lo resuelva.

## Tecnologías

React 19, TypeScript, TanStack Start y Router, Vite, Tailwind CSS, Radix Dialog y Lucide. Netlify Functions sirve la API. Netlify Database almacena equipos y partidos mediante Drizzle ORM; Netlify Identity controla el acceso de administradores.

## Desarrollo local

Instala Node.js 22.13+ y pnpm. Ejecuta `pnpm install --frozen-lockfile`, vincula el sitio con Netlify CLI y ejecuta `netlify dev --port 8889` para disponer de la emulación de funciones, base de datos e identidad. Las migraciones de `netlify/database/migrations` se aplican mediante la plataforma, no manualmente. Los estilos usan las fuentes DM Sans y Barlow Condensed de Google Fonts.

## Primer acceso de administración

En el panel de Netlify del proyecto, abre Identity e invita tu correo. En los detalles de tu usuario, asigna el rol `admin` y guarda. Acepta la invitación y define tu contraseña en la web. El botón **Administrar** abre el acceso privado. Una cuenta sin ese rol no puede modificar el torneo.

## Uso

Registra los 24 equipos y sus jugadores. Genera el calendario una sola vez. Desde Resultados y fechas, selecciona partidos para programarlos o introducir resultados. Las fechas se introducen y muestran en UTC; los dos marcadores vacíos indican un partido pendiente.

Los puestos 1–12 proyectan Champions y 13–24 Europa League. En Copa clasifican los 16 mejores de la temporada anterior, con cruces de octavos 1–16, 2–15, 3–14, 4–13, 5–12, 6–11, 7–10 y 8–9. La Supercopa de la Liga enfrenta campeón de Liga contra subcampeón de Copa y subcampeón de Liga contra campeón de Copa; sus semifinales y final son a doble partido. La Supercopa de Europa enfrenta a los campeones de Champions y Europa League a doble partido. Los cupos son provisionales hasta completar los 276 partidos de liga. El administrador genera cada fase desde el panel (octavos de Copa, rondas siguientes, semifinales y final de Supercopa de Liga, final de Supercopa de Europa) a partir de resultados ya finalizados; nada avanza sin una acción explícita. Las eliminatorias se juegan a ida y vuelta y, si el global queda empatado, se registra la tanda de penaltis en la vuelta. Si un finalista de Copa ya ocupa una plaza de Liga en la Supercopa, su plaza pasa al tercer clasificado de Liga y siguientes. No se incluyen equipos, fechas ni resultados inventados.

### Estadísticas individuales

En Gestión del torneo → Jugadores, registra a cada futbolista con su equipo. En Resultados y fechas, selecciona un partido, introduce el marcador y los goles y asistencias de sus jugadores, y elige un único MVP (opcional). Guarda todos los datos con el mismo botón.

La pestaña pública Estadísticas muestra goleadores, asistidores y premios MVP de la competición seleccionada. Solo cuenta partidos finalizados y muestra posiciones compartidas en caso de empate. Los futbolistas con el mismo nombre en equipos diferentes tienen registros independientes. Las estadísticas faltantes pueden completarse después; no se deducen del marcador.

Las correcciones reemplazan las estadísticas anteriores dentro de una transacción, sin duplicar acumulados. Al dejar ambos marcadores vacíos, el partido vuelve a pendiente y se eliminan sus estadísticas y MVP. El servidor comprueba permisos de administrador, pertenencia de jugadores a los equipos, duplicados y que los goles y asistencias por equipo no superen el marcador. La base de datos limita a un MVP por partido.

## Comprobaciones y versión de pruebas

`pnpm run verify:complete` ejecuta las auditorías estáticas, Vitest, TypeScript, ESLint y la compilación de producción; Netlify lo usa como comando de build, así que un deploy solo se completa si todo pasa. Las migraciones se aplican automáticamente a la base de datos del propio proyecto de Netlify en cada deploy, y un fallo detiene el deploy.

Este repositorio se usa como **proyecto de pruebas independiente**, con su propia base de datos (vacía al inicio) y su propio Identity. No comparte datos ni usuarios con la web publicada. Consulta `CAMBIOS-FASE23-VERSION-DE-PRUEBAS.md` para el estado de la verificación y los pasos pendientes antes de publicar.
