export const SCENARIO_STORAGE_PREFIX = 'ufl-saved-scenarios'
export const MAX_SCENARIOS_PER_SEASON = 8

export type ClassificationScenarioSnapshot = {
  id: number
  name: string
  seasonId: number
  scenario: 'A' | 'B'
  predictions: Record<number, { home: string; away: string }>
  rows: Array<{
    teamId: number
    teamName: string
    position: number
    points: number
    predictedMatches: number
  }>
  createdAt: string
}

export type ScenarioStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function getScenarioStorageKey(seasonId: number): string {
  return `${SCENARIO_STORAGE_PREFIX}:${seasonId}`
}

function getStorage(storage?: ScenarioStorageLike): ScenarioStorageLike | null {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScore(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || /^(?:[0-9]|1[0-9]|20)$/.test(value))
}

export function isValidStoredScenario(value: unknown, expectedSeasonId: number): value is ClassificationScenarioSnapshot {
  if (!isRecord(value)) return false

  if (
    typeof value.id !== 'number' || !Number.isFinite(value.id) ||
    typeof value.name !== 'string' || value.name.trim().length === 0 ||
    typeof value.seasonId !== 'number' || value.seasonId !== expectedSeasonId ||
    (value.scenario !== 'A' && value.scenario !== 'B') ||
    typeof value.createdAt !== 'string' || value.createdAt.trim().length === 0 ||
    !isRecord(value.predictions) || !Array.isArray(value.rows)
  ) return false

  for (const prediction of Object.values(value.predictions)) {
    if (!isRecord(prediction) || !isScore(prediction.home) || !isScore(prediction.away)) return false
  }

  for (const row of value.rows) {
    if (
      !isRecord(row) ||
      typeof row.teamId !== 'number' || !Number.isFinite(row.teamId) ||
      typeof row.teamName !== 'string' || row.teamName.trim().length === 0 ||
      typeof row.position !== 'number' || !Number.isFinite(row.position) ||
      typeof row.points !== 'number' || !Number.isFinite(row.points) ||
      typeof row.predictedMatches !== 'number' || !Number.isFinite(row.predictedMatches) || row.predictedMatches < 0
    ) return false
  }

  return true
}

export type ScenarioBundle = {
  format: 'ufl-scenarios'
  schemaVersion: 1
  metadata: {
    exportedAt: string
    appVersion: string
    scope: 'season'
    seasonId: number
    scenarioCount: number
  }
  scenarios: ClassificationScenarioSnapshot[]
}

export function exportScenarioBundle(
  scenarios: ClassificationScenarioSnapshot[],
  seasonId: number,
  appVersion = 'unknown',
): ScenarioBundle {
  const valid = scenarios
    .filter((item) => isValidStoredScenario(item, seasonId))
    .slice(-MAX_SCENARIOS_PER_SEASON)

  return {
    format: 'ufl-scenarios',
    schemaVersion: 1,
    metadata: {
      exportedAt: new Date().toISOString(),
      appVersion,
      scope: 'season',
      seasonId,
      scenarioCount: valid.length,
    },
    scenarios: valid,
  }
}

export type ScenarioBundleValidation =
  | { ok: true; scenarios: ClassificationScenarioSnapshot[]; warning: string | null }
  | { ok: false; error: string }

export function validateScenarioBundle(input: unknown, expectedSeasonId: number): ScenarioBundleValidation {
  if (!isRecord(input) || input.format !== 'ufl-scenarios' || input.schemaVersion !== 1) {
    return { ok: false, error: 'El archivo no es un paquete UFL compatible (schemaVersion 1).' }
  }
  if (!isRecord(input.metadata) || !Array.isArray(input.scenarios)) {
    return { ok: false, error: 'El archivo no contiene metadatos o una lista de escenarios válida.' }
  }

  const metadata = input.metadata
  if (
    typeof metadata.exportedAt !== 'string' ||
    typeof metadata.appVersion !== 'string' ||
    metadata.scope !== 'season' ||
    typeof metadata.seasonId !== 'number' ||
    typeof metadata.scenarioCount !== 'number'
  ) {
    return { ok: false, error: 'Los metadatos del archivo están incompletos o tienen un formato incorrecto.' }
  }
  if (metadata.seasonId !== expectedSeasonId) {
    return { ok: false, error: `El archivo corresponde a la temporada ${metadata.seasonId}, no a la temporada seleccionada (${expectedSeasonId}).` }
  }

  const scenarios = input.scenarios.filter((item): item is ClassificationScenarioSnapshot => isValidStoredScenario(item, expectedSeasonId))
  const invalidCount = input.scenarios.length - scenarios.length
  const versionWarning = metadata.appVersion !== 'unknown' && metadata.appVersion !== (import.meta.env?.VITE_APP_VERSION ?? 'unknown')
    ? `El archivo se exportó desde otra versión (${metadata.appVersion}).`
    : null
  const invalidWarning = invalidCount > 0 ? `Se descartaron ${invalidCount} registro(s) inválido(s).` : null

  return {
    ok: true,
    scenarios,
    warning: [versionWarning, invalidWarning].filter(Boolean).join(' ') || null,
  }
}

export function getScenarioImportSignature(snapshot: ClassificationScenarioSnapshot): string {
  return JSON.stringify([
    snapshot.seasonId,
    snapshot.name.trim(),
    snapshot.scenario,
    snapshot.predictions,
    snapshot.rows,
  ])
}

export function loadScenariosFromStorage(
  seasonId: number,
  providedStorage?: ScenarioStorageLike,
): ClassificationScenarioSnapshot[] {
  const key = getScenarioStorageKey(seasonId)

  try {
    const storage = getStorage(providedStorage)
    if (!storage) return []

    const raw = storage.getItem(key)
    if (raw === null) return []

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      console.error(`Los escenarios de la temporada ${seasonId} contienen JSON corrupto:`, error)
      try {
        storage.removeItem(key)
      } catch (removeError) {
        console.warn('No se pudo retirar la entrada de escenarios corrupta:', removeError)
      }
      return []
    }

    if (!Array.isArray(parsed)) {
      console.warn(`La entrada de escenarios de la temporada ${seasonId} no es una lista.`)
      try { storage.removeItem(key) } catch (removeError) {
        console.warn('No se pudo retirar la entrada de escenarios inválida:', removeError)
      }
      return []
    }

    const valid = parsed.filter((item): item is ClassificationScenarioSnapshot => isValidStoredScenario(item, seasonId))
    const limited = valid.slice(-MAX_SCENARIOS_PER_SEASON)

    // Limpia los registros defectuosos y los excedentes cuando el almacenamiento lo permite.
    if (limited.length !== parsed.length) {
      try {
        storage.setItem(key, JSON.stringify(limited))
      } catch (writeError) {
        console.warn('Se recuperaron escenarios válidos, pero no se pudo normalizar el almacenamiento:', writeError)
      }
    }

    return limited
  } catch (error) {
    console.error(`No se pudieron recuperar los escenarios de la temporada ${seasonId}:`, error)
    return []
  }
}

export function saveScenariosToStorage(
  seasonId: number,
  scenarios: ClassificationScenarioSnapshot[],
  providedStorage?: ScenarioStorageLike,
): boolean {
  try {
    const storage = getStorage(providedStorage)
    if (!storage) return false

    const valid = scenarios.filter((item) => isValidStoredScenario(item, seasonId))
    const limited = valid.slice(-MAX_SCENARIOS_PER_SEASON)
    storage.setItem(getScenarioStorageKey(seasonId), JSON.stringify(limited))
    return true
  } catch (error) {
    console.error(`No se pudieron guardar los escenarios de la temporada ${seasonId}:`, error)
    return false
  }
}
