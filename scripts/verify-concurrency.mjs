import { readFileSync } from 'node:fs';

const source = readFileSync('netlify/functions/tournament.mts', 'utf8');
const checks = [];
const pass = (name) => { checks.push({ name, ok: true }); console.log(`✓ ${name}`); };
const fail = (name) => { checks.push({ name, ok: false }); console.error(`✗ ${name}`); };

const matchActionStart = source.indexOf("} else if (body.action === 'match') {");
const resultActionStart = source.indexOf("} else if (body.action === 'result') {", matchActionStart);
const matchAction = matchActionStart >= 0 && resultActionStart > matchActionStart
  ? source.slice(matchActionStart, resultActionStart)
  : '';
const seasonActionStart = source.indexOf("if (body.action === 'createSeason') {");
const cupActionStart = source.indexOf("} else if (body.action === 'generateCup') {", seasonActionStart);
const seasonAction = seasonActionStart >= 0 && cupActionStart > seasonActionStart
  ? source.slice(seasonActionStart, cupActionStart)
  : '';

if (matchAction) pass('Se encontró el bloque de creación manual de partidos');
else fail('No se pudo aislar el bloque de creación manual de partidos');
if (/await db\.transaction\(async \(tx\) => \{/.test(matchAction)) pass('Crear un partido usa una transacción');
else fail('Crear un partido no usa una transacción');
if (/pg_advisory_xact_lock\(24001\)/.test(matchAction)) pass('Crear un partido comparte el bloqueo con el cambio de temporada');
else fail('Falta el bloqueo compartido al crear partidos');
if (/tx\.select\(\)\.from\(seasons\)\.where\(eq\(seasons\.isCurrent, true\)\)/.test(matchAction)) pass('La temporada activa se consulta dentro de la transacción');
else fail('La temporada activa se consulta fuera de la transacción o no se consulta');
if (/tx\.insert\(matches\)\.values\(/.test(matchAction)) pass('El partido se inserta mediante la misma transacción');
else fail('La inserción del partido no está dentro de la transacción');
if (/pg_advisory_xact_lock\(24001\)/.test(seasonAction) && /tx\.update\(seasons\)\.set\(\{ isCurrent: false \}\)/.test(seasonAction)) pass('Cambiar temporada comparte el bloqueo y actualiza dentro de la transacción');
else fail('El cambio de temporada no tiene el bloqueo/transacción esperados');
if (/homeId === data.awayId/.test(matchAction)) pass('Se rechazan partidos entre el mismo equipo');
else fail('No se encontró la validación de equipos distintos');
if (/data\.competition === 'liga'/.test(matchAction)) pass('La Liga sigue reservada al generador de calendario');
else fail('No se encontró la protección del calendario de Liga');

const failed = checks.filter((check) => !check.ok);
console.log(`\nAuditoría estática de concurrencia: ${checks.length - failed.length}/${checks.length} comprobaciones correctas.`);
if (failed.length) {
  console.error('Esta revisión de código no sustituye una prueba concurrente contra PostgreSQL.');
  process.exitCode = 1;
} else {
  console.log('Nota: es una auditoría estática; no ejecuta transacciones en una base de datos real.');
}
