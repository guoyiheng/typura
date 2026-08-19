import type { Table } from 'dexie'
import Dexie from 'dexie'

const EXAMPLE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000
const MISSING_EXAMPLE_CACHE_TTL = 24 * 60 * 60 * 1000
const FAILURE_RETRY_DELAY = 5 * 60 * 1000
const CACHE_VERSION = 12
const REQUEST_TIMEOUT = 8000
const IMAGE_REQUEST_TIMEOUT = 2500
const DEFAULT_WORD_API_BASE = ''

const pendingDetails = new Map<string, Promise<WordDetails>>()
const pendingImages = new Map<string, Promise<WordMnemonicImage>>()

export type WordExample = {
  english: string
  chinese: string
  audio?: {
    url: string
    source: 'Tatoeba'
    author: string
    license: string
    attributionUrl: string
  }
}

export type WordPhonetic = {
  usphone: string
  ukphone: string
}

export type SimilarWord = {
  word: string
  meaning: string
}

export type WordMnemonic = {
  meaning: {
    primary: string
    secondary: string[]
  } | null
  fullMeanings: string[]
  rootAnalysis: string | null
  imageUrl: string | null
  imageSource?: string | null
  imageSourceUrl?: string | null
  similarWords: SimilarWord[]
}

type WordMnemonicImage = Pick<WordMnemonic, 'imageUrl' | 'imageSource' | 'imageSourceUrl'>

const EMPTY_MNEMONIC: WordMnemonic = {
  meaning: null,
  fullMeanings: [],
  rootAnalysis: null,
  imageUrl: null,
  imageSource: null,
  imageSourceUrl: null,
  similarWords: [],
}

export type WordDetails = {
  example: WordExample | null
  phonetic: WordPhonetic | null
  mnemonic: WordMnemonic
}

type WordDetailsResponse = {
  example: WordExample | null
  phonetic?: WordPhonetic | null
  mnemonic?: WordMnemonic
}

type CachedWordExample = {
  word: string
  example: WordExample | null
  phonetic?: WordPhonetic | null
  mnemonic?: WordMnemonic
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
  if (typeof example.english !== 'string' || typeof example.chinese !== 'string') return false
  if (example.audio === undefined) return true
  if (typeof example.audio !== 'object' || example.audio === null) return false

  const audio = example.audio as Record<string, unknown>
  return (
    typeof audio.url === 'string' &&
    audio.source === 'Tatoeba' &&
    typeof audio.author === 'string' &&
    typeof audio.license === 'string' &&
    typeof audio.attributionUrl === 'string'
  )
}

function isWordPhonetic(value: unknown): value is WordPhonetic {
  if (typeof value !== 'object' || value === null) return false
  const phonetic = value as Record<string, unknown>
  return typeof phonetic.usphone === 'string' && typeof phonetic.ukphone === 'string'
}

function isWordMnemonic(value: unknown): value is WordMnemonic {
  if (typeof value !== 'object' || value === null) return false
  const mnemonic = value as Record<string, unknown>
  const meaning = mnemonic.meaning
  const fullMeanings = mnemonic.fullMeanings
  const similarWords = mnemonic.similarWords
  const isMeaningValid =
    meaning === null ||
    (typeof meaning === 'object' &&
      typeof (meaning as Record<string, unknown>).primary === 'string' &&
      Array.isArray((meaning as Record<string, unknown>).secondary) &&
      (meaning as { secondary: unknown[] }).secondary.every((item) => typeof item === 'string'))

  return (
    isMeaningValid &&
    Array.isArray(fullMeanings) &&
    fullMeanings.every((item) => typeof item === 'string') &&
    (mnemonic.rootAnalysis === null || typeof mnemonic.rootAnalysis === 'string') &&
    (mnemonic.imageUrl === null || typeof mnemonic.imageUrl === 'string') &&
    (mnemonic.imageSource === undefined || mnemonic.imageSource === null || typeof mnemonic.imageSource === 'string') &&
    (mnemonic.imageSourceUrl === undefined || mnemonic.imageSourceUrl === null || typeof mnemonic.imageSourceUrl === 'string') &&
    Array.isArray(similarWords) &&
    similarWords.length <= 5 &&
    similarWords.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).word === 'string' &&
        typeof (item as Record<string, unknown>).meaning === 'string',
    )
  )
}

function isWordMnemonicImage(value: unknown): value is WordMnemonicImage {
  if (typeof value !== 'object' || value === null) return false
  const image = value as Record<string, unknown>
  return (
    (image.imageUrl === null || typeof image.imageUrl === 'string') &&
    (image.imageSource === undefined || image.imageSource === null || typeof image.imageSource === 'string') &&
    (image.imageSourceUrl === undefined || image.imageSourceUrl === null || typeof image.imageSourceUrl === 'string')
  )
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

function normalizeMnemonic(mnemonic: WordMnemonic | undefined): WordMnemonic {
  return mnemonic ? { ...EMPTY_MNEMONIC, ...mnemonic, similarWords: mnemonic.similarWords ?? [] } : EMPTY_MNEMONIC
}

function getCacheTTL(details: WordDetails) {
  return details.example ||
    details.phonetic ||
    details.mnemonic.meaning ||
    details.mnemonic.fullMeanings.length > 0 ||
    details.mnemonic.rootAnalysis ||
    details.mnemonic.imageUrl ||
    details.mnemonic.similarWords.length > 0
    ? EXAMPLE_CACHE_TTL
    : MISSING_EXAMPLE_CACHE_TTL
}

function hasWordDetails(details: WordDetails) {
  return getCacheTTL(details) === EXAMPLE_CACHE_TTL
}

function isFreshCachedExample(cached: CachedWordExample) {
  const details = { example: cached.example, phonetic: cached.phonetic ?? null, mnemonic: normalizeMnemonic(cached.mnemonic) }
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

async function completeWordPhonetic(word: string, phonetic: WordPhonetic | null, signal?: AbortSignal): Promise<WordPhonetic | null> {
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
      mnemonic: normalizeMnemonic(cached.mnemonic),
    }
    if (details.phonetic !== cached.phonetic) await cacheDetails(normalizedWord, details)
    cacheMemoryDetails(normalizedWord, details, cached.updatedAt + getCacheTTL(details))
    return details
  }
  if (!hasWordApi()) {
    const fallbackPhonetic = await completeWordPhonetic(normalizedWord, cached?.phonetic ?? null, signal)
    const fallback = { example: cached?.example ?? null, phonetic: fallbackPhonetic, mnemonic: normalizeMnemonic(cached?.mnemonic) }
    if (hasWordDetails(fallback)) {
      await cacheDetails(normalizedWord, fallback)
    }
    cacheMemoryDetails(normalizedWord, fallback, Date.now() + (hasWordDetails(fallback) ? EXAMPLE_CACHE_TTL : FAILURE_RETRY_DELAY))
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
    const mnemonic = normalizeMnemonic(detailsResponse.mnemonic)
    if (example !== null && !isWordExample(example)) throw new Error('Invalid word example payload')
    if (phonetic !== null && !isWordPhonetic(phonetic)) throw new Error('Invalid word phonetic payload')
    if (!isWordMnemonic(mnemonic)) throw new Error('Invalid word mnemonic payload')

    phonetic = await completeWordPhonetic(normalizedWord, phonetic, signal)

    const details = { example, phonetic, mnemonic }
    await cacheDetails(normalizedWord, details)
    cacheMemoryDetails(normalizedWord, details)
    return details
  } catch (error) {
    if (!controller.signal.aborted) console.error('Failed to load word example', error)
    const fallbackPhonetic = await completeWordPhonetic(normalizedWord, cached?.phonetic ?? null, signal)
    const fallback = { example: cached?.example ?? null, phonetic: fallbackPhonetic, mnemonic: normalizeMnemonic(cached?.mnemonic) }
    if (hasWordDetails(fallback)) {
      await cacheDetails(normalizedWord, fallback)
    }
    cacheMemoryDetails(normalizedWord, fallback, Date.now() + (hasWordDetails(fallback) ? EXAMPLE_CACHE_TTL : FAILURE_RETRY_DELAY))
    return fallback
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortRequest)
  }
}

export function getWordDetails(word: string, signal?: AbortSignal): Promise<WordDetails> {
  const normalizedWord = normalizeWord(word)
  if (!normalizedWord) return Promise.resolve({ example: null, phonetic: null, mnemonic: EMPTY_MNEMONIC })

  const pending = pendingDetails.get(normalizedWord)
  if (pending) return pending

  const request = loadWordDetails(normalizedWord, signal).finally(() => {
    if (pendingDetails.get(normalizedWord) === request) pendingDetails.delete(normalizedWord)
  })
  pendingDetails.set(normalizedWord, request)
  return request
}

function getWordImage(word: string, signal?: AbortSignal): Promise<WordMnemonicImage> {
  const normalizedWord = normalizeWord(word)
  if (!normalizedWord) return Promise.resolve(EMPTY_MNEMONIC)

  const pending = pendingImages.get(normalizedWord)
  if (pending) return pending

  const request = (async () => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), IMAGE_REQUEST_TIMEOUT)
    const abortRequest = () => controller.abort()
    signal?.addEventListener('abort', abortRequest, { once: true })

    try {
      const response = await fetch(getWordApiUrl('/api/word-image', { word: normalizedWord }), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) return EMPTY_MNEMONIC

      const image: unknown = await response.json()
      return isWordMnemonicImage(image) ? image : EMPTY_MNEMONIC
    } catch {
      return EMPTY_MNEMONIC
    } finally {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', abortRequest)
    }
  })().finally(() => {
    if (pendingImages.get(normalizedWord) === request) pendingImages.delete(normalizedWord)
  })

  pendingImages.set(normalizedWord, request)
  return request
}

export function getWordExample(word: string, signal?: AbortSignal): Promise<WordExample | null> {
  return getWordDetails(word, signal).then((details) => details.example)
}

export function getWordPhonetic(word: string, signal?: AbortSignal): Promise<WordPhonetic | null> {
  return getWordDetails(word, signal).then((details) => details.phonetic)
}

export async function getWordMnemonic(word: string, signal?: AbortSignal): Promise<WordMnemonic> {
  const normalizedWord = normalizeWord(word)
  const details = await getWordDetails(normalizedWord, signal)
  if (details.mnemonic.imageUrl) return details.mnemonic

  const image = await getWordImage(normalizedWord, signal)
  if (!image.imageUrl) return details.mnemonic

  const mnemonic = { ...details.mnemonic, ...image }
  const nextDetails = { ...details, mnemonic }
  cacheMemoryDetails(normalizedWord, nextDetails)
  await cacheDetails(normalizedWord, nextDetails)
  return mnemonic
}

export async function prefetchWordExamples(words: string[]) {
  const uniqueWords = Array.from(new Set(words.map(normalizeWord).filter((word) => word && !word.includes(' '))))
  await Promise.allSettled(uniqueWords.map((word) => getWordExample(word)))
}
