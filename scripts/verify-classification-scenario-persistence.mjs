import assert from 'node:assert/strict'
import {
  getScenarioStorageKey,
  loadScenariosFromStorage,
  saveScenariosToStorage,
  exportScenarioBundle,
  validateScenarioBundle,
  getScenarioImportSignature,
} from '../src/lib/classification-scenario-storage.ts'

class MemoryStorage {
  data = new Map()
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null }
  setItem(key, value) { this.data.set(key, String(value)) }
  removeItem(key) { this.data.delete(key) }
}

function snapshot(id, seasonId = 10) {
  return {
    id,
    name: `Escenario ${id}`,
    seasonId,
    scenario: id % 2 ? 'A' : 'B',
    predictions: { [100 + id]: { home: '2', away: '1' } },
    rows: [{ teamId: 1, teamName: 'Equipo Uno', position: 1, points: 30 + id, predictedMatches: 1 }],
    createdAt: `24/10/2026, 00:0${id}:00`,
  }
}

const muted = (fn) => {
  const originalError = console.error
  const originalWarn = console.warn
  console.error = () => {}
  console.warn = () => {}
  try { return fn() } finally { console.error = originalError; console.warn = originalWarn }
}

// 1. Guardado y recarga: lo escrito puede recuperarse en una nueva lectura.
{
  const storage = new MemoryStorage()
  const items = [snapshot(1), snapshot(2)]
  assert.equal(saveScenariosToStorage(10, items, storage), true)
  assert.deepEqual(loadScenariosFromStorage(10, storage), items)
}

// 2. Aislamiento: cada temporada utiliza una clave diferente.
{
  const storage = new MemoryStorage()
  saveScenariosToStorage(10, [snapshot(1, 10)], storage)
  saveScenariosToStorage(20, [snapshot(2, 20)], storage)
  assert.equal(getScenarioStorageKey(10), 'ufl-saved-scenarios:10')
  assert.equal(loadScenariosFromStorage(10, storage)[0].id, 1)
  assert.equal(loadScenariosFromStorage(20, storage)[0].id, 2)
}

// 3. FIFO: guardar nueve conserva los ocho más recientes.
{
  const storage = new MemoryStorage()
  const nine = Array.from({ length: 9 }, (_, index) => snapshot(index + 1))
  assert.equal(saveScenariosToStorage(10, nine, storage), true)
  assert.deepEqual(loadScenariosFromStorage(10, storage).map((item) => item.id), [2, 3, 4, 5, 6, 7, 8, 9])
}

// 4. Registro corrupto dentro de una lista: solo se descarta el inválido.
{
  const storage = new MemoryStorage()
  storage.setItem(getScenarioStorageKey(10), JSON.stringify([snapshot(1), { id: 'incompleto' }, snapshot(2)]))
  const recovered = loadScenariosFromStorage(10, storage)
  assert.deepEqual(recovered.map((item) => item.id), [1, 2])
  assert.deepEqual(JSON.parse(storage.getItem(getScenarioStorageKey(10))).map((item) => item.id), [1, 2])
}

// 5. JSON corrupto: no se propaga el error y se intenta limpiar la clave.
{
  const storage = new MemoryStorage()
  storage.setItem(getScenarioStorageKey(10), '{JSON corrupto')
  assert.deepEqual(muted(() => loadScenariosFromStorage(10, storage)), [])
  assert.equal(storage.getItem(getScenarioStorageKey(10)), null)
}

// 6. Entrada antigua con más de ocho escenarios: se recuperan los ocho últimos.
{
  const storage = new MemoryStorage()
  storage.setItem(getScenarioStorageKey(10), JSON.stringify(Array.from({ length: 11 }, (_, index) => snapshot(index + 1))))
  assert.deepEqual(loadScenariosFromStorage(10, storage).map((item) => item.id), [4, 5, 6, 7, 8, 9, 10, 11])
}

// 7. Errores de lectura y escritura: se gestionan sin propagarlos.
{
  const readFailure = { getItem() { throw new Error('lectura denegada') }, setItem() {}, removeItem() {} }
  const writeFailure = { getItem() { return null }, setItem() { throw new Error('cuota agotada') }, removeItem() {} }
  assert.deepEqual(muted(() => loadScenariosFromStorage(10, readFailure)), [])
  assert.equal(muted(() => saveScenariosToStorage(10, [snapshot(1)], writeFailure)), false)
}

// 8. Sin acceso a window/localStorage (SSR o entorno bloqueado) no se lanza una excepción.
{
  assert.deepEqual(loadScenariosFromStorage(10), [])
  assert.equal(saveScenariosToStorage(10, [snapshot(1)]), false)
}

// 9. Exportación JSON y validación del paquete importado.
{
  const items = [snapshot(1), snapshot(2)]
  const bundle = exportScenarioBundle(items, 10, 'test-version')
  assert.equal(bundle.format, 'ufl-scenarios')
  assert.equal(bundle.schemaVersion, 1)
  assert.equal(bundle.metadata.scenarioCount, 2)
  const validated = validateScenarioBundle(bundle, 10)
  assert.equal(validated.ok, true)
  if (validated.ok) assert.deepEqual(validated.scenarios, items)
  assert.equal(validateScenarioBundle(bundle, 20).ok, false)
  assert.equal(getScenarioImportSignature(items[0]), getScenarioImportSignature({ ...items[0], id: 999 }))
}

// 10. Error al eliminar una entrada corrupta: la carga sigue devolviendo una lista segura.
{
  const storage = {
    getItem() { return '{corrupto' },
    setItem() {},
    removeItem() { throw new Error('eliminación denegada') },
  }
  assert.deepEqual(muted(() => loadScenariosFromStorage(10, storage)), [])
}

console.log('OK 10/10 pruebas de persistencia, intercambio y consistencia de escenarios')
