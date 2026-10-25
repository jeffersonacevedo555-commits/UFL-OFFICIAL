# Fase 23 — versión de pruebas independiente

Esta fase prepara el proyecto para desplegarse en un **proyecto de Netlify de pruebas, separado de la web publicada**, con su propia base de datos (nueva y vacía) y su propio Netlify Identity. No se ha tocado la web original ni su base de datos.

## Correcciones

1. **Dependencias.** `pnpm install --frozen-lockfile` se completó correctamente: el lockfile coincide con `package.json`. El error `EAI_AGAIN` de fases anteriores no se repitió.
2. **Árbol de rutas.** Faltaba `src/routeTree.gen.ts`. Sin él, en un clon limpio `router.ssr.test.tsx` (Vitest) y `tsc --noEmit` fallaban antes de llegar a `vite build`, que es lo que lo genera. Se generó con el generador oficial de TanStack Router y ahora está versionado.
3. **Snapshot de Drizzle.** Las migraciones de penaltis e integridad se escribieron a mano y no tenían `snapshot.json`. `drizzle-kit generate` las veía como pendientes y creaba una migración duplicada (`ADD COLUMN home_penalty_score`…) que habría hecho fallar el siguiente deploy. Se añadió el snapshot del esquema final en `20261022073000_enforce_match_score_integrity`, y ahora `drizzle-kit generate` responde «No schema changes». No se cambió ningún SQL.
4. **Supercopa de Liga.** Si un finalista de Copa también era campeón de Liga, el servidor cubría su plaza con la tabla desde el 1.º, así que le quitaba la plaza al subcampeón de Liga. La regla documentada y probada dice «tercer puesto y siguientes». La lógica pasó a `supercopaLigaCandidates` en `src/lib/tournament.ts`, con una prueba Vitest nueva.
5. **ESLint.** Faltaba declarar `console` y `process` en `scripts/*.mjs`, lo que habría dado errores `no-undef`. Además, `load()` llamaba a `setState` de forma síncrona dentro de `useEffect`, algo que la regla `react-hooks/set-state-in-effect` (error en la v7) marca como fallo. Ahora el error se limpia después de recibir los datos.
6. **Identity** quedó habilitado en el proyecto de pruebas.

## Estado de las comprobaciones

| Comprobación | Estado |
|---|---|
| Instalación con lockfile | Correcta (ejecutada) |
| Sincronía esquema ↔ migraciones (`drizzle-kit generate`) | Correcta (ejecutada en una copia temporal, sin generar archivos en el proyecto) |
| Vitest (40/40), TypeScript, ESLint | Correctas, ejecutadas localmente tras corregir una prueba de Copa desfasada y dos errores de lint |
| `vite build` | Correcta en el primer deploy de pruebas; se repite en cada deploy |
| Migraciones en PostgreSQL | Se aplican a la base de datos de pruebas al desplegar; si una falla, el deploy falla. Base vacía: no comprueba datos heredados. |
| Flujo completo de Copa y Supercopas con datos reales | Pendiente: requiere un administrador y 24 equipos de prueba. |

## Pasos antes de publicar

1. Revisar el log del deploy de pruebas: deben aparecer como correctas las 6 etapas de `verify:complete` y la aplicación de las 5 migraciones.
2. En Identity del proyecto de pruebas: poner el registro en «Invite only», invitar a un correo y asignarle el rol `admin`.
3. Recorrer el panel: temporada, 24 equipos, calendario, resultados (incluidos penaltis), nueva temporada, Copa de octavos a final, Supercopa de Liga y Supercopa de Europa.
4. Para comprobar las migraciones con datos reales, hacer una copia de seguridad de la base de producción y probarlas sobre una copia (por ejemplo, un Deploy Preview de la web original, que usa una rama aislada de la base). Nunca sobre producción.
5. Solo después, decidir la publicación.
