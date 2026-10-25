import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import { db } from '../../db/index.js'
import { teams, players, news, adminAuditEvents } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Config } from '@netlify/functions'

// Fase 63: escudos de equipo y fotos de jugador.
// Los binarios se guardan en Netlify Blobs (tienda «media»); la base de datos
// solo conserva la clave del objeto actual en teams.crest_image / players.photo_image.
const MAX_IMAGE_BYTES = 400 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}
const KEY_PATTERN = /^(teams|players|news)\/(\d+)\/([A-Za-z0-9_-]+)\.(png|jpe?g|webp)$/

const store = getStore('media')

const KIND_PREFIX: Record<'team' | 'player' | 'news', string> = {
  team: 'teams',
  player: 'players',
  news: 'news',
}

async function saveBlob(
  data: { kind: 'team' | 'player' | 'news'; id: number; dataUrl?: string | null; remove?: boolean },
): Promise<string | null> {
  if (data.remove) return null
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data.dataUrl ?? '')
  if (!match) throw new Error('Formato no admitido. Usa PNG, JPG o WebP.')
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1]
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.byteLength === 0) throw new Error('La imagen está vacía.')
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('La imagen supera el límite de 400 KB.')
  const key = `${KIND_PREFIX[data.kind]}/${data.id}/${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`
  await store.set(key, bytes)
  return key
}

function contentTypeFor(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_TYPES[extension] ?? 'application/octet-stream'
}

async function requireAdmin(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    throw new Error('Origen no permitido.')
  const user = await getUser()
  if (!user?.roles?.includes('admin'))
    throw new Error('Necesitas una cuenta con rol admin.')
  return user
}

export default async (req: Request) => {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    if (req.method === 'GET') {
      const key = new URL(req.url).searchParams.get('key') ?? ''
      if (!KEY_PATTERN.test(key)) return new Response('Clave no válida.', { status: 400, headers })
      const data = await store.get(key, { type: 'arrayBuffer' })
      if (!data) return new Response('Imagen no encontrada.', { status: 404, headers })
      return new Response(data, {
        headers: {
          'Content-Type': contentTypeFor(key),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
    if (req.method !== 'POST') return new Response(null, { status: 405 })
    const user = await requireAdmin(req)
    const body = await req.json()
    const data = z
      .object({
        kind: z.enum(['team', 'player', 'news']),
        id: z.number().int().positive(),
        dataUrl: z.string().nullable().optional(),
        remove: z.boolean().optional(),
      })
      .parse(body)
    let previousKey: string | null = null
    let nextKey: string | null = null
    if (data.kind === 'team') {
      const [entity] = await db.select().from(teams).where(eq(teams.id, data.id)).limit(1)
      if (!entity) throw new Error('El equipo seleccionado no existe.')
      previousKey = entity.crestImage
      nextKey = await saveBlob(data)
      await db.update(teams).set({ crestImage: nextKey }).where(eq(teams.id, data.id))
    } else if (data.kind === 'player') {
      const [entity] = await db.select().from(players).where(eq(players.id, data.id)).limit(1)
      if (!entity) throw new Error('El jugador seleccionado no existe.')
      previousKey = entity.photoImage
      nextKey = await saveBlob(data)
      await db.update(players).set({ photoImage: nextKey }).where(eq(players.id, data.id))
    } else {
      const [entity] = await db.select().from(news).where(eq(news.id, data.id)).limit(1)
      if (!entity) throw new Error('La noticia seleccionada no existe.')
      previousKey = entity.imageKey
      nextKey = await saveBlob(data)
      await db.update(news).set({ imageKey: nextKey }).where(eq(news.id, data.id))
    }
    if (previousKey && previousKey !== nextKey) await store.delete(previousKey)
    await db.insert(adminAuditEvents).values({
      entityType: data.kind,
      entityId: data.id,
      action: 'updated',
      actorId: user.id ? String(user.id) : null,
      actorEmail: user.email ?? null,
      beforeSnapshot: { image: previousKey },
      afterSnapshot: nextKey === null ? null : { image: nextKey },
    })
    return Response.json({ ok: true, key: nextKey }, { headers })
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? 'Revisa los datos de la imagen.'
        : error instanceof Error
          ? error.message
          : 'No se pudo guardar la imagen.'
    return Response.json({ error: message }, { status: 400, headers })
  }
}

export const config: Config = { path: '/api/media' }
