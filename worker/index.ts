const JSON_CACHE_CONTROL = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400'
const MISSING_EXAMPLE_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600'
const MAX_WORD_LENGTH = 80
const MAX_JSON_BYTES = 2 * 1024 * 1024
const EXAMPLE_CACHE_VERSION = '4'
const MISSING_EXAMPLE_CACHE_TTL = 24 * 60 * 60 * 1000

type WordExample = {
  english: string
  chinese: string
}

type WordPhonetic = {
  usphone: string
  ukphone: string
}

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Access-Control-Allow-Origin', '*')
  return Response.json(data, { ...init, headers })
}

function normalizeWord(value: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

function isValidWord(word: string) {
  return word.length > 0 && word.length <= MAX_WORD_LENGTH && /^\p{Script=Latin}[\p{Script=Latin}' -]*$/u.test(word)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getRecordValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return isRecord(value) ? value : undefined
}

function parseWordExample(payload: unknown): WordExample | null {
  if (!isRecord(payload)) return null

  const bilingualSentences = getRecordValue(payload, 'blng_sents_part') ?? getRecordValue(payload, 'blng_sents')
  const rawPairs = bilingualSentences?.['sentence-pair']
  const pairs = Array.isArray(rawPairs) ? rawPairs : rawPairs ? [rawPairs] : []

  for (const pair of pairs) {
    if (!isRecord(pair)) continue
    const english = typeof pair.sentence === 'string' ? pair.sentence.trim() : ''
    const chinese = typeof pair['sentence-translation'] === 'string' ? pair['sentence-translation'].trim() : ''
    if (english) return { english, chinese }
  }

  return null
}

function parseWordPhonetic(payload: unknown): WordPhonetic | null {
  if (!isRecord(payload)) return null

  const ecWords = getRecordValue(payload, 'ec')?.word
  const simpleWords = getRecordValue(payload, 'simple')?.word

  const wordsList = [
    ...(Array.isArray(ecWords) ? ecWords : ecWords ? [ecWords] : []),
    ...(Array.isArray(simpleWords) ? simpleWords : simpleWords ? [simpleWords] : []),
  ]

  let usphone = ''
  let ukphone = ''
  let phone = ''

  for (const item of wordsList) {
    if (!isRecord(item)) continue
    if (!usphone && typeof item.usphone === 'string') usphone = item.usphone.trim()
    if (!ukphone && typeof item.ukphone === 'string') ukphone = item.ukphone.trim()
    if (!phone && typeof item.phone === 'string') phone = item.phone.trim()
  }

  usphone = usphone || phone
  ukphone = ukphone || phone
  return usphone || ukphone ? { usphone, ukphone } : null
}

function getCachedRequest(request: Request) {
  const url = new URL(request.url)
  url.searchParams.sort()
  return new Request(url.toString(), { method: 'GET' })
}

function isCurrentExampleCacheResponse(response: Response) {
  return response.headers.get('X-Typura-Example-Cache-Version') === EXAMPLE_CACHE_VERSION
}

function isFreshMissingExample(response: Response) {
  const cachedAt = Number(response.headers.get('X-Typura-Example-Missing-At'))
  return Number.isFinite(cachedAt) && Date.now() - cachedAt < MISSING_EXAMPLE_CACHE_TTL
}

async function handleWordExample(request: Request, ctx: ExecutionContext) {
  const word = normalizeWord(new URL(request.url).searchParams.get('word'))
  if (!isValidWord(word)) {
    return jsonResponse({ error: 'invalid_word' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const cache = caches.default
  const cacheKey = getCachedRequest(request)
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse && isCurrentExampleCacheResponse(cachedResponse)) {
    const status = cachedResponse.headers.get('X-Typura-Example-Status')
    if (status === 'hit' || (status === 'missing' && isFreshMissingExample(cachedResponse))) return cachedResponse
  }

  const upstreamUrl = new URL('https://dict.youdao.com/jsonapi')
  upstreamUrl.searchParams.set('q', word)

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'typura/1.0',
      },
    })
  } catch (error) {
    console.error('Word example upstream request failed', error)
    return jsonResponse({ error: 'upstream_unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!upstreamResponse.ok) {
    return jsonResponse({ error: 'upstream_error' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  const contentLength = Number(upstreamResponse.headers.get('Content-Length') ?? 0)
  if (contentLength > MAX_JSON_BYTES) {
    return jsonResponse({ error: 'upstream_response_too_large' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  let payload: unknown
  try {
    payload = await upstreamResponse.json()
  } catch {
    return jsonResponse({ error: 'invalid_upstream_response' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  const example = parseWordExample(payload)
  const phonetic = parseWordPhonetic(payload)
  const hasDetails = Boolean(example || phonetic)
  const headers = new Headers({
    'Cache-Control': hasDetails ? JSON_CACHE_CONTROL : MISSING_EXAMPLE_CACHE_CONTROL,
    'X-Typura-Example-Cache-Version': EXAMPLE_CACHE_VERSION,
    'X-Typura-Example-Status': hasDetails ? 'hit' : 'missing',
  })
  if (!hasDetails) headers.set('X-Typura-Example-Missing-At', Date.now().toString())

  const response = jsonResponse(
    { example, phonetic },
    {
      headers,
    },
  )
  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'GET, OPTIONS', 'Cache-Control': 'no-store' } })
    }

    if (url.pathname === '/api/word-example') return handleWordExample(request, ctx)
    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
