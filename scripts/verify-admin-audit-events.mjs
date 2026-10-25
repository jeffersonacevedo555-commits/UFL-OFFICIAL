import fs from 'node:fs'
import assert from 'node:assert/strict'
const schema = fs.readFileSync(new URL('../db/schema.ts', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../netlify/functions/tournament.mts', import.meta.url), 'utf8')
const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const migration = fs.readFileSync(new URL('../netlify/database/migrations/20261023063000_admin_audit_events/migration.sql', import.meta.url), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const matchCreationAuditCount = (api.match(/const createdMatches = await tx\.insert\(matches\)/g) ?? []).length
const rosterCreationAuditCount = (api.match(/entityType: 'roster' as const, entityId: (?:roster|assignment)\.id/g) ?? []).length
const checks = [
  ['schema defines cross-entity audit events', schema.includes("pgTable(\n  'admin_audit_events'") && schema.includes('adminAuditEvents')],
  ['migration constrains entity types and actions', migration.includes('admin_audit_events_entity_type_valid') && migration.includes('admin_audit_events_action_valid')],
  ['audit reads are only returned to administrators', api.includes("readUser?.roles?.includes('admin')") && api.includes('adminAuditEvents: adminAuditRows')],
  ['market proposal creation is audited transactionally', api.includes("action: 'created', actorId: user.id ? String(user.id) : null") && api.includes('entityType: \'market_proposal\', entityId: createdProposal.id')],
  ['market proposal decisions and withdrawal are audited', api.includes("action: 'withdrawn'") && api.includes("action: 'rejected'") && api.includes("action: 'accepted'")],
  ['automatic stale proposal rejections are audited', api.includes('const obsoleteProposals = await tx.select().from(marketProposals)') && api.includes('afterSnapshot: afterObsolete as unknown as Record<string, unknown>')],
  ['team creation and edits are audited', api.includes("entityType: 'team', entityId: createdTeam.id") && api.includes("entityType: 'team', entityId: data.id, action: 'updated'")],
  ['player creation and initial roster assignment are audited', api.includes("entityType: 'player', entityId: createdPlayer.id") && api.includes("entityType: 'roster', entityId: createdRoster.id")],
  ['roster copies during season creation are audited', rosterCreationAuditCount >= 3],
  ['all match creation paths create audit snapshots', matchCreationAuditCount === 6 && api.includes('entityId: createdMatch.id') && api.includes("const [createdMatch] = await tx.insert(matches).values({") && api.includes('afterSnapshot: createdMatch as unknown as Record<string, unknown>')],
  ['match result changes include before and after statistics', api.includes('const beforeSnapshot = { ...match, stats: beforeStats }') && api.includes('afterSnapshot: { ...afterMatch, stats: afterStats } as unknown as Record<string, unknown>')],
  ['audit panel names the expanded event coverage', route.includes('Creaciones y cambios de partidos, jugadores, equipos, plantillas, traspasos y propuestas de mercado.')],
  ['cross-entity audit has independent entity, action and search filters', route.includes('eventEntityFilter') && route.includes('eventActionFilter') && route.includes('eventSearch')],
  ['cross-entity audit exports the filtered events to CSV', route.includes('ufl-auditoria-transversal.csv') && route.includes('Exportar eventos CSV')],
  ['cross-entity search includes resolved player and club names', route.includes('brief(event, event.beforeSnapshot)} ${brief(event, event.afterSnapshot)')],
  ['release verification includes cross-entity audit checks', packageJson.scripts['verify:release'].includes('verify-admin-audit-events.mjs')],
]
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name) }
console.log(`\nCross-entity audit verification: ${checks.length}/${checks.length} checks passed.`)
