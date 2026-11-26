const CHUNK_SIZE = 64 * 1024
const MAX_PAYLOAD_LENGTH = 8 * 1024 * 1024

type ProgressSnapshotMeta = {
  updatedAt: number
  chunks: number
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * 每个口令对应一个存储实例，保存该口令下最新的一份进度快照。
 * 快照按块保存，避免单条存储值过大。
 */
export class ProgressStore {
  private readonly storage: DurableObjectStorage

  constructor(state: DurableObjectState) {
    this.storage = state.storage
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'PUT') return this.save(request)
    if (request.method === 'GET') return this.read()

    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  private async save(request: Request): Promise<Response> {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'invalid_body' }, 400)
    }

    if (!isRecord(body) || typeof body.payload !== 'string' || typeof body.updatedAt !== 'number') {
      return jsonResponse({ error: 'invalid_body' }, 400)
    }
    if (!body.payload || body.payload.length > MAX_PAYLOAD_LENGTH) {
      return jsonResponse({ error: 'invalid_payload' }, 413)
    }

    const previousMeta = await this.storage.get<ProgressSnapshotMeta>('meta')
    const chunks: string[] = []
    for (let index = 0; index < body.payload.length; index += CHUNK_SIZE) {
      chunks.push(body.payload.slice(index, index + CHUNK_SIZE))
    }

    if (chunks.length > 0) {
      const chunkEntries: Record<string, string> = {}
      chunks.forEach((chunk, index) => {
        chunkEntries[`chunk:${index}`] = chunk
      })
      await this.storage.put(chunkEntries)
    }

    const updatedAt = Math.floor(body.updatedAt)
    await this.storage.put('meta', { updatedAt, chunks: chunks.length } satisfies ProgressSnapshotMeta)

    const previousChunks = previousMeta?.chunks ?? 0
    if (previousChunks > chunks.length) {
      await this.storage.delete(Array.from({ length: previousChunks - chunks.length }, (_, offset) => `chunk:${chunks.length + offset}`))
    }

    return jsonResponse({ updatedAt })
  }

  private async read(): Promise<Response> {
    const meta = await this.storage.get<ProgressSnapshotMeta>('meta')
    if (!meta) return jsonResponse({ error: 'not_found' }, 404)

    const parts: string[] = []
    for (let index = 0; index < meta.chunks; index += 1) {
      const chunk = await this.storage.get<string>(`chunk:${index}`)
      if (typeof chunk !== 'string') return jsonResponse({ error: 'corrupted_snapshot' }, 500)
      parts.push(chunk)
    }

    return jsonResponse({ updatedAt: meta.updatedAt, payload: parts.join('') })
  }
}
