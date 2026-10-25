# UFL — revisión segura, fase 1

Esta entrega es una primera actualización del código fuente recuperado de Netlify. No se ha publicado ni se ha conectado a la base de datos real.

## Cambios incluidos

- Añade Supercopa de la Liga y Supercopa de Europa como competiciones seleccionables en la web y en el panel de partidos.
- Actualiza el formato visible de Copa a 16 clasificados de la temporada anterior, con cruces 1–16, 2–15, 3–14, 4–13, 5–12, 6–11, 7–10 y 8–9.
- Actualiza el texto de las dos supercopas según las reglas acordadas.
- Actualiza el desempate de la clasificación: puntos, diferencia de goles, mini-tabla de enfrentamientos directos, goles a favor y menos goles en contra. Si persiste el empate, se mantiene temporalmente un orden estable por ID; falta la resolución manual desde administración.
- Añade funciones auxiliares aisladas para crear eliminatorias de ida/vuelta, generar los octavos de Copa con los puestos 1–16 de una clasificación completa de 24 equipos y generar la final de Supercopa de Europa a doble partido.
- Se compiló el módulo de torneo por separado y pasaron comprobaciones independientes de estas funciones. Esto no equivale a compilar ni probar la aplicación completa.
- Mueve el acceso de administración desde la cabecera al pie de página para que sea menos prominente. La protección real sigue estando en el servidor mediante el rol `admin`.
- La lista de Copa avisa de que el sistema actual todavía no guarda tablas históricas por temporada. Por eso, no presenta la clasificación actual como si fuera la clasificación anterior.

## Lo que aún no está implementado

- Selección automática de clasificados de temporadas anteriores (la base del historial de temporadas se añade en la fase 2; falta validar la migración en base de datos real).
- Conectar la generación de eliminatorias al panel y a la base de datos; generación de rondas posteriores y avance automático, con desempate por penales.
- Salón de la Fama, premios, Balón de Oro y once ideal.
- Noticias con borradores, publicación e imágenes.
- Fotografías compartidas de equipos y jugadores.
- Mercado de fichajes compartido.
- Sistema de apuestas con puntos virtuales, cuotas, parlays, liquidación e historial.

## Importante antes de publicar

La aplicación completa no se ha compilado ni probado con todas sus dependencias, porque el entorno de trabajo no pudo descargarlas. Solo se compiló el módulo de torneo por separado y se ejecutaron comprobaciones independientes. No la publiques sobre el sitio actual sin validar el build. No incluye ni modifica los datos de Netlify Database, ni las cuentas de Identity. Conserva el ZIP original de `source` y el ZIP `deploy` como copias de seguridad.
