import type { Table } from 'dexie'
import Dexie from 'dexie'

const EXAMPLE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000
const MISSING_EXAMPLE_CACHE_TTL = 24 * 60 * 60 * 1000
const FAILURE_RETRY_DELAY = 5 * 60 * 1000
const CACHE_VERSION = 5
const REQUEST_TIMEOUT = 5000
const DEFAULT_WORD_API_BASE = ''

const pendingDetails = new Map<string, Promise<WordDetails>>()

export type WordExample = {
  english: string
  chinese: string
}

export type WordPhonetic = {
  usphone: string
  ukphone: string
}

type WordDetails = {
  example: WordExample | null
  phonetic: WordPhonetic | null
}

type WordDetailsResponse = {
  example: WordExample | null
  phonetic?: WordPhonetic | null
}

type CachedWordExample = {
  word: string
  example: WordExample | null
  phonetic?: WordPhonetic | null
  updatedAt: number
  version?: number
}

class WordExampleCacheDB extends Dexie {
  examples!: Table<CachedWordExample, string>

  constructor() {
    super('WordExampleCacheDB')
    this.version(1).stores({
      examples: 'word,updatedAt',
    })
  }
}

const wordExampleCacheDB = new WordExampleCacheDB()

function normalizeWord(word: string) {
  return word.trim().toLowerCase()
}

function isWordExample(value: unknown): value is WordExample {
  if (typeof value !== 'object' || value === null) return false
  const example = value as Record<string, unknown>
  return typeof example.english === 'string' && typeof example.chinese === 'string'
}

function isWordPhonetic(value: unknown): value is WordPhonetic {
  if (typeof value !== 'object' || value === null) return false
  const phonetic = value as Record<string, unknown>
  return typeof phonetic.usphone === 'string' && typeof phonetic.ukphone === 'string'
}

function getApiBase() {
  return (import.meta.env.VITE_WORD_API_BASE?.trim() || DEFAULT_WORD_API_BASE).replace(/\/+$/, '')
}

export function hasWordApi() {
  return import.meta.env.PROD || import.meta.env.DEV || Boolean(getApiBase())
}

export function getWordApiUrl(pathname: string, params: Record<string, string>) {
  const base = getApiBase()
  const url = new URL(`${base}${pathname}`, base ? undefined : window.location.origin)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return base ? url.toString() : `${url.pathname}${url.search}`
}

async function getCachedExample(word: string) {
  try {
    return await wordExampleCacheDB.examples.get(word)
  } catch {
    return undefined
  }
}

async function cacheDetails(word: string, details: WordDetails) {
  try {
    await wordExampleCacheDB.examples.put({ word, ...details, updatedAt: Date.now(), version: CACHE_VERSION })
  } catch {
    // IndexedDB may be unavailable in private browsing modes.
  }
}

type MemoryCachedWordExample = {
  details: WordDetails
  expiresAt: number
}

const memoryExampleCache = new Map<string, MemoryCachedWordExample>()

function getCacheTTL(details: WordDetails) {
  return details.example || details.phonetic ? EXAMPLE_CACHE_TTL : MISSING_EXAMPLE_CACHE_TTL
}

function isFreshCachedExample(cached: CachedWordExample) {
  const details = { example: cached.example, phonetic: cached.phonetic ?? null }
  return cached.version === CACHE_VERSION && Date.now() - cached.updatedAt < getCacheTTL(details)
}

function cacheMemoryDetails(word: string, details: WordDetails, expiresAt = Date.now() + getCacheTTL(details)) {
  memoryExampleCache.set(word, { details, expiresAt })
}

async function fetchFreeDictionaryPhonetic(word: string, signal?: AbortSignal): Promise<WordPhonetic | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    let usphone = ''
    let ukphone = ''
    let genericPhone = ''

    for (const entry of data) {
      if (typeof entry !== 'object' || entry === null) continue
      const obj = entry as Record<string, unknown>
      if (typeof obj.phonetic === 'string' && obj.phonetic.trim()) {
        genericPhone = obj.phonetic.trim()
      }
      if (Array.isArray(obj.phonetics)) {
        for (const p of obj.phonetics) {
          if (typeof p !== 'object' || p === null) continue
          const pObj = p as Record<string, unknown>
          const text = typeof pObj.text === 'string' ? pObj.text.trim() : ''
          const audio = typeof pObj.audio === 'string' ? pObj.audio : ''
          if (text) {
            if (audio.includes('-us.') || audio.includes('/us/')) {
              usphone = text
            } else if (audio.includes('-uk.') || audio.includes('/uk/')) {
              ukphone = text
            } else if (!genericPhone) {
              genericPhone = text
            }
          }
        }
      }
    }

    usphone = usphone || genericPhone
    ukphone = ukphone || genericPhone
    if (usphone || ukphone) {
      return { usphone, ukphone }
    }
    return null
  } catch {
    return null
  }
}

async function completeWordPhonetic(
  word: string,
  phonetic: WordPhonetic | null,
  signal?: AbortSignal,
): Promise<WordPhonetic | null> {
  if (phonetic?.usphone && phonetic.ukphone) return phonetic

  const fallback = await fetchFreeDictionaryPhonetic(word, signal)
  if (!phonetic) return fallback
  if (!fallback) return phonetic

  return {
    usphone: phonetic.usphone || fallback.usphone,
    ukphone: phonetic.ukphone || fallback.ukphone,
  }
}

async function loadWordDetails(normalizedWord: string, signal?: AbortSignal): Promise<WordDetails> {
  const memCached = memoryExampleCache.get(normalizedWord)
  if (memCached && Date.now() < memCached.expiresAt) {
    return memCached.details
  }

  const cached = await getCachedExample(normalizedWord)
  if (cached && isFreshCachedExample(cached)) {
    const details = {
      example: cached.example,
      phonetic: await completeWordPhonetic(normalizedWord, cached.phonetic ?? null, signal),
    }
    if (details.phonetic !== cached.phonetic) await cacheDetails(normalizedWord, details)
    cacheMemoryDetails(normalizedWord, details, cached.updatedAt + getCacheTTL(details))
    return details
  }
  if (!hasWordApi()) {
    const fallbackPhonetic = await completeWordPhonetic(normalizedWord, cached?.phonetic ?? null, signal)
    const fallback = { example: cached?.example ?? null, phonetic: fallbackPhonetic }
    if (fallback.example || fallback.phonetic) {
      await cacheDetails(normalizedWord, fallback)
    }
    cacheMemoryDetails(normalizedWord, fallback, Date.now() + (fallback.phonetic ? EXAMPLE_CACHE_TTL : FAILURE_RETRY_DELAY))
    return fallback
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  const abortRequest = () => controller.abort()
  signal?.addEventListener('abort', abortRequest, { once: true })

  try {
    const response = await fetch(getWordApiUrl('/api/word-example', { word: normalizedWord }), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Word example request failed with status ${response.status}`)

    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null || !('example' in data)) throw new Error('Invalid word example response')
    const detailsResponse = data as WordDetailsResponse
    const example = detailsResponse.example
    let phonetic = detailsResponse.phonetic ?? null
    if (example !== null && !isWordExample(example)) throw new Error('Invalid word example payload')
    if (phonetic !== null && !isWordPhonetic(phonetic)) throw new Error('Invalid word phonetic payload')

    phonetic = await completeWordPhonetic(normalizedWord, phonetic, signal)

    const details = { example, phonetic }
    await cacheDetails(normalizedWord, details)
    cacheMemoryDetails(normalizedWord, details)
    return details
  } catch (error) {
    if (!controller.signal.aborted) console.error('Failed to load word example', error)
    const fallbackPhonetic = await completeWordPhonetic(normalizedWord, cached?.phonetic ?? null, signal)
    const fallback = { example: cached?.example ?? null, phonetic: fallbackPhonetic }
    if (fallback.example || fallback.phonetic) {
      await cacheDetails(normalizedWord, fallback)
    }
    cacheMemoryDetails(normalizedWord, fallback, Date.now() + (fallback.phonetic ? EXAMPLE_CACHE_TTL : FAILURE_RETRY_DELAY))
    return fallback
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortRequest)
  }
}

function getWordDetails(word: string, signal?: AbortSignal): Promise<WordDetails> {
  const normalizedWord = normalizeWord(word)
  if (!normalizedWord) return Promise.resolve({ example: null, phonetic: null })

  const pending = pendingDetails.get(normalizedWord)
  if (pending) return pending

  const request = loadWordDetails(normalizedWord, signal).finally(() => {
    if (pendingDetails.get(normalizedWord) === request) pendingDetails.delete(normalizedWord)
  })
  pendingDetails.set(normalizedWord, request)
  return request
}

export function getWordExample(word: string, signal?: AbortSignal): Promise<WordExample | null> {
  return getWordDetails(word, signal).then((details) => details.example)
}

export function getWordPhonetic(word: string, signal?: AbortSignal): Promise<WordPhonetic | null> {
  return getWordDetails(word, signal).then((details) => details.phonetic)
}

export async function prefetchWordExamples(words: string[]) {
  const uniqueWords = Array.from(new Set(words.map(normalizeWord).filter((word) => word && !word.includes(' '))))
  await Promise.allSettled(uniqueWords.map((word) => getWordExample(word)))
}
