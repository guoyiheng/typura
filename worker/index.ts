const JSON_CACHE_CONTROL = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400'
const MISSING_EXAMPLE_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600'
const MAX_WORD_LENGTH = 80
const MAX_JSON_BYTES = 2 * 1024 * 1024
const EXAMPLE_CACHE_VERSION = '11'
const IMAGE_CACHE_VERSION = '1'
const MISSING_EXAMPLE_CACHE_TTL = 24 * 60 * 60 * 1000

type WordExample = {
  english: string
  chinese: string
}

type WordPhonetic = {
  usphone: string
  ukphone: string
}

type SimilarWord = {
  word: string
  meaning: string
}

type WordMnemonic = {
  meaning: {
    primary: string
    secondary: string[]
  } | null
  fullMeanings: string[]
  rootAnalysis: string | null
  imageUrl: string | null
  imageSource: string | null
  imageSourceUrl: string | null
  similarWords: SimilarWord[]
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

function getArray(value: unknown) {
  return Array.isArray(value) ? value : value ? [value] : []
}

function cleanMeaningText(value: string) {
  return value
    .replace(/^(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|aux|int)\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanSenseText(value: string) {
  return value
    .replace(/^[（(][^）)]{1,60}[）)]\s*/, '')
    .replace(/(?:\[[^\]]+\]|【[^】]+】)/g, '')
    .replace(/[。；;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactCandidateMeaning(value: string) {
  const firstClause = cleanMeaningText(value).split(/[；;]/)[0] ?? ''
  return firstClause
    .split(/[，,、]/)
    .map(cleanSenseText)
    .filter(Boolean)
    .slice(0, 2)
    .join('、')
}

function parseWordMeaning(payload: unknown): WordMnemonic['meaning'] {
  const ecWords = getRecordValue(payload, 'ec')?.word

  for (const wordEntry of getArray(ecWords)) {
    if (!isRecord(wordEntry)) continue

    for (const translation of getArray(wordEntry.trs)) {
      if (!isRecord(translation)) continue

      for (const translationEntry of getArray(translation.tr)) {
        if (!isRecord(translationEntry)) continue
        const rawMeanings = getRecordValue(translationEntry, 'l')?.i

        for (const rawMeaning of getArray(rawMeanings)) {
          if (typeof rawMeaning !== 'string' || rawMeaning.startsWith('【名】')) continue

          const clauses = cleanMeaningText(rawMeaning)
            .split(/[；;]/)
            .map((clause) => clause.trim())
            .filter(Boolean)
          if (clauses.length === 0) continue

          const firstSense = clauses[0]
            .split(/[，,、]/)
            .map(cleanSenseText)
            .filter(Boolean)
          const primary = firstSense.slice(0, 2).join('、') || clauses[0]
          const secondary = [...firstSense.slice(2), ...clauses.slice(1)]
            .map(cleanSenseText)
            .filter((sense, index, values) => sense && sense !== primary && values.indexOf(sense) === index)
            .slice(0, 2)

          return { primary, secondary }
        }
      }
    }
  }

  return null
}

function parseFullMeanings(payload: unknown) {
  const ecWords = getRecordValue(payload, 'ec')?.word
  const meanings: string[] = []

  for (const wordEntry of getArray(ecWords)) {
    if (!isRecord(wordEntry)) continue
    for (const translation of getArray(wordEntry.trs)) {
      if (!isRecord(translation)) continue
      for (const translationEntry of getArray(translation.tr)) {
        if (!isRecord(translationEntry)) continue
        const rawMeanings = getRecordValue(translationEntry, 'l')?.i
        for (const rawMeaning of getArray(rawMeanings)) {
          if (typeof rawMeaning !== 'string' || rawMeaning.startsWith('【名】')) continue
          const meaning = rawMeaning.replace(/\s+/g, ' ').trim()
          if (meaning && !meanings.includes(meaning)) meanings.push(meaning)
        }
      }
    }
  }

  return meanings.slice(0, 8)
}

type SimilarWordCandidate = {
  word: string
  meaning?: string
  isSameRoot: boolean
}

function getDamerauLevenshteinDistance(left: string, right: string) {
  const rows = left.length + 1
  const columns = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0))

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost)
      }
    }
  }

  return matrix[left.length][right.length]
}

function getCommonPrefixLength(left: string, right: string) {
  const maxLength = Math.min(left.length, right.length)
  let length = 0
  while (length < maxLength && left[length] === right[length]) length += 1
  return length
}

function isVisuallySimilar(sourceWord: string, candidateWord: string, isSameRoot: boolean) {
  if (!/^[a-z]+$/.test(candidateWord) || candidateWord === sourceWord) return false
  const distance = getDamerauLevenshteinDistance(sourceWord, candidateWord)
  const maxLength = Math.max(sourceWord.length, candidateWord.length)
  const similarity = 1 - distance / maxLength
  const commonPrefixLength = getCommonPrefixLength(sourceWord, candidateWord)

  if (isSameRoot) return similarity >= 0.46 || commonPrefixLength >= Math.min(4, sourceWord.length - 1)
  if (maxLength <= 5) return distance <= 1
  return distance <= 2 && similarity >= 0.64
}

function addSimilarCandidate(
  candidates: Map<string, SimilarWordCandidate>,
  sourceWord: string,
  wordValue: unknown,
  meaningValue: unknown,
  isSameRoot: boolean,
) {
  if (typeof wordValue !== 'string') return
  const word = normalizeWord(wordValue)
  if (!isValidWord(word) || word.includes(' ') || !isVisuallySimilar(sourceWord, word, isSameRoot)) return

  const meaning = typeof meaningValue === 'string' ? compactCandidateMeaning(meaningValue) : undefined
  const existing = candidates.get(word)
  candidates.set(word, {
    word,
    meaning: existing?.meaning || meaning,
    isSameRoot: existing?.isSameRoot || isSameRoot,
  })
}

function parseRelatedWordCandidates(payload: unknown, sourceWord: string) {
  const candidates = new Map<string, SimilarWordCandidate>()
  const relGroups = getRecordValue(payload, 'rel_word')?.rels

  for (const relGroup of getArray(relGroups)) {
    if (!isRecord(relGroup)) continue
    const words = getRecordValue(relGroup, 'rel')?.words
    for (const wordEntry of getArray(words)) {
      if (!isRecord(wordEntry)) continue
      addSimilarCandidate(candidates, sourceWord, wordEntry.word, wordEntry.tran, true)
    }
  }

  const discriminateGroups = getRecordValue(payload, 'discriminate')?.data
  for (const group of getArray(discriminateGroups)) {
    if (!isRecord(group)) continue
    for (const headword of getArray(group.headwords)) {
      addSimilarCandidate(candidates, sourceWord, headword, undefined, false)
    }
  }

  return candidates
}

async function fetchSpellingCandidates(sourceWord: string) {
  const prefixLength = Math.min(Math.max(3, sourceWord.length - 2), 5)
  const suggestUrl = new URL('https://dict.youdao.com/suggest')
  suggestUrl.searchParams.set('num', '30')
  suggestUrl.searchParams.set('doctype', 'json')
  suggestUrl.searchParams.set('q', sourceWord.slice(0, prefixLength))

  try {
    const response = await fetch(suggestUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'typura/1.0' },
      signal: AbortSignal.timeout(1800),
    })
    if (!response.ok) return []
    const payload: unknown = await response.json()
    const entries = getRecordValue(getRecordValue(payload, 'data') ?? {}, 'entries')
    return getArray(entries).filter(isRecord)
  } catch {
    return []
  }
}

async function fetchWordPayload(word: string, signal?: AbortSignal) {
  const upstreamUrl = new URL('https://dict.youdao.com/jsonapi')
  upstreamUrl.searchParams.set('q', word)

  const response = await fetch(upstreamUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'typura/1.0',
    },
    signal,
  })
  if (!response.ok) return null

  const contentLength = Number(response.headers.get('Content-Length') ?? 0)
  if (contentLength > MAX_JSON_BYTES) return null

  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

async function getSimilarWords(payload: unknown, sourceWord: string): Promise<SimilarWord[]> {
  const candidateMap = parseRelatedWordCandidates(payload, sourceWord)
  const spellingCandidates = await fetchSpellingCandidates(sourceWord)
  for (const entry of spellingCandidates) {
    addSimilarCandidate(candidateMap, sourceWord, entry.entry, entry.explain, false)
  }

  const candidates = [...candidateMap.values()]
    .sort((left, right) => {
      const leftDistance = getDamerauLevenshteinDistance(sourceWord, left.word)
      const rightDistance = getDamerauLevenshteinDistance(sourceWord, right.word)
      const leftScore = leftDistance / Math.max(sourceWord.length, left.word.length) - (left.isSameRoot ? 0.08 : 0)
      const rightScore = rightDistance / Math.max(sourceWord.length, right.word.length) - (right.isSameRoot ? 0.08 : 0)
      return leftScore - rightScore || left.word.length - right.word.length || left.word.localeCompare(right.word)
    })
    .slice(0, 8)

  const results = await Promise.allSettled(
    candidates.map(async (candidate) => {
      if (candidate.meaning) return { word: candidate.word, meaning: candidate.meaning }
      const relatedPayload = await fetchWordPayload(candidate.word, AbortSignal.timeout(2500))
      const meaning = parseWordMeaning(relatedPayload)?.primary
      return meaning ? { word: candidate.word, meaning } : null
    }),
  )

  return results
    .filter((result): result is PromiseFulfilledResult<SimilarWord | null> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((item): item is SimilarWord => item !== null)
    .slice(0, 5)
}

function getEtymologyValues(payload: unknown, language: 'zh' | 'en') {
  const rawEntries = getRecordValue(getRecordValue(payload, 'etym') ?? {}, 'etyms')?.[language]
  return getArray(rawEntries)
    .filter(isRecord)
    .map((entry) => (typeof entry.value === 'string' ? entry.value.trim() : ''))
    .filter(Boolean)
}

function compactRootAnalysis(word: string, value: string) {
  const sentences = value.replace(/\u200e/g, '').match(/[^。！？\n]+[。！？]?/g) ?? []
  const constructionSentence = sentences.find((sentence) => /(?:构成|组成)/.test(sentence))

  if (constructionSentence) {
    const construction = constructionSentence.match(/(?:后者|该词|它)?由(.{2,160}?)(?:复合)?(?:构成|组成)/)
    if (construction?.[1]) {
      const parts = construction[1]
        .trim()
        .replace(/）和(?=[\p{Script=Latin}])/gu, '） + ')
        .replace(/）与(?=[\p{Script=Latin}])/gu, '） + ')
      return `${word} = ${parts}`
    }
  }

  const originSentence = sentences.find((sentence) => /(?:来自|源自|衍生自)/.test(sentence))
  if (originSentence) return originSentence.trim().slice(0, 140)

  return null
}

function parseRootAnalysis(payload: unknown, word: string) {
  for (const value of getEtymologyValues(payload, 'zh')) {
    const analysis = compactRootAnalysis(word, value)
    if (analysis) return analysis
  }

  for (const value of getEtymologyValues(payload, 'en')) {
    const normalizedValue = value.replace(/\u200e/g, '')
    const parts = normalizedValue.match(/from\s+([^,]+?)\s*\([“"]([^”"]+)[”"]\)\s*\+\s*([^,]+?)\s*\([“"]([^”"]+)[”"]\)/i)
    if (parts) return `${word} = ${parts[1].trim()} (${parts[2].trim()}) + ${parts[3].trim()} (${parts[4].trim()})`

    const source = normalizedValue
      .split(',')[0]
      ?.replace(/^from\s+/i, '')
      .trim()
    if (source) return `${word} 源自 ${source}`
  }

  return null
}

function parseWordImage(payload: unknown) {
  const rawPictures = getRecordValue(payload, 'pic_dict')?.pic
  const imageUrls = getArray(rawPictures)
    .filter(isRecord)
    .map((picture) => {
      if (typeof picture.image === 'string') return picture.image.trim()
      return typeof picture.url === 'string' ? picture.url.trim() : ''
    })
    .filter((url) => /^https:\/\//i.test(url))

  const imageUrl = imageUrls.find((url) => /\.(?:jpe?g|webp)(?:\?|$)/i.test(url)) ?? imageUrls[0] ?? null
  if (!imageUrl) return null

  return {
    imageUrl,
    imageSource: '词典配图',
    imageSourceUrl: null,
  }
}

function parseWordMnemonic(payload: unknown, word: string, similarWords: SimilarWord[]): WordMnemonic {
  const image = parseWordImage(payload)
  return {
    meaning: parseWordMeaning(payload),
    fullMeanings: parseFullMeanings(payload),
    rootAnalysis: parseRootAnalysis(payload, word),
    imageUrl: image?.imageUrl ?? null,
    imageSource: image?.imageSource ?? null,
    imageSourceUrl: image?.imageSourceUrl ?? null,
    similarWords,
  }
}

async function fetchWikipediaImage(word: string) {
  const imageApiUrl = new URL('https://en.wikipedia.org/w/api.php')
  imageApiUrl.searchParams.set('action', 'query')
  imageApiUrl.searchParams.set('generator', 'search')
  imageApiUrl.searchParams.set('gsrsearch', word)
  imageApiUrl.searchParams.set('gsrlimit', '1')
  imageApiUrl.searchParams.set('prop', 'pageimages')
  imageApiUrl.searchParams.set('pithumbsize', '420')
  imageApiUrl.searchParams.set('format', 'json')

  try {
    const response = await fetch(imageApiUrl, {
      headers: {
        Accept: 'application/json',
        'Api-User-Agent': 'typura/1.0 (https://typura.yiheng.run)',
        'User-Agent': 'typura/1.0 (https://typura.yiheng.run)',
      },
      signal: AbortSignal.timeout(1800),
    })
    if (!response.ok) return null

    const contentLength = Number(response.headers.get('Content-Length') ?? 0)
    if (contentLength > 256 * 1024) return null

    const payload: unknown = await response.json()
    const pages = getRecordValue(getRecordValue(payload, 'query') ?? {}, 'pages')
    if (!pages) return null

    for (const page of Object.values(pages)) {
      if (!isRecord(page)) continue
      const thumbnail = getRecordValue(page, 'thumbnail')
      const imageUrl = typeof thumbnail?.source === 'string' ? thumbnail.source.trim() : ''
      const pageId = typeof page.pageid === 'number' ? page.pageid : null
      if (!/^https:\/\/upload\.wikimedia\.org\//i.test(imageUrl) || pageId === null) continue

      return {
        imageUrl,
        imageSource: 'Wikimedia',
        imageSourceUrl: `https://en.wikipedia.org/?curid=${pageId}`,
      }
    }
  } catch {
    return null
  }

  return null
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

function isCurrentImageCacheResponse(response: Response) {
  return response.headers.get('X-Typura-Image-Cache-Version') === IMAGE_CACHE_VERSION
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

  let payload: unknown
  try {
    payload = await fetchWordPayload(word)
  } catch (error) {
    console.error('Word example upstream request failed', error)
    return jsonResponse({ error: 'upstream_unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!payload) {
    return jsonResponse({ error: 'upstream_error' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  const example = parseWordExample(payload)
  const phonetic = parseWordPhonetic(payload)
  const similarWords = await getSimilarWords(payload, word)
  const mnemonic = parseWordMnemonic(payload, word, similarWords)
  const hasDetails = Boolean(
    example ||
    phonetic ||
    mnemonic.meaning ||
    mnemonic.fullMeanings.length ||
    mnemonic.rootAnalysis ||
    mnemonic.imageUrl ||
    mnemonic.similarWords.length,
  )
  const headers = new Headers({
    'Cache-Control': hasDetails ? JSON_CACHE_CONTROL : MISSING_EXAMPLE_CACHE_CONTROL,
    'X-Typura-Example-Cache-Version': EXAMPLE_CACHE_VERSION,
    'X-Typura-Example-Status': hasDetails ? 'hit' : 'missing',
  })
  if (!hasDetails) headers.set('X-Typura-Example-Missing-At', Date.now().toString())

  const response = jsonResponse(
    { example, phonetic, mnemonic },
    {
      headers,
    },
  )
  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

async function handleWordImage(request: Request, ctx: ExecutionContext) {
  const word = normalizeWord(new URL(request.url).searchParams.get('word'))
  if (!isValidWord(word)) {
    return jsonResponse({ error: 'invalid_word' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const cache = caches.default
  const cacheKey = getCachedRequest(request)
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse && isCurrentImageCacheResponse(cachedResponse)) {
    const status = cachedResponse.headers.get('X-Typura-Image-Status')
    if (status === 'hit' || (status === 'missing' && isFreshMissingExample(cachedResponse))) return cachedResponse
  }

  const image = await fetchWikipediaImage(word)
  const headers = new Headers({
    'Cache-Control': image ? JSON_CACHE_CONTROL : MISSING_EXAMPLE_CACHE_CONTROL,
    'X-Typura-Image-Cache-Version': IMAGE_CACHE_VERSION,
    'X-Typura-Image-Status': image ? 'hit' : 'missing',
  })
  if (!image) headers.set('X-Typura-Example-Missing-At', Date.now().toString())

  const response = jsonResponse(
    image ?? {
      imageUrl: null,
      imageSource: null,
      imageSourceUrl: null,
    },
    { headers },
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
    if (url.pathname === '/api/word-image') return handleWordImage(request, ctx)
    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
