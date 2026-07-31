import type { Word } from '@/typings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeWord(value: unknown): Word | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null

  const name = value.name.trim()
  if (!name) return null

  const trans = Array.isArray(value.trans)
    ? value.trans.filter((item): item is string => typeof item === 'string')
    : typeof value.trans === 'string'
      ? [value.trans]
      : []

  return {
    ...value,
    name,
    trans,
    usphone: typeof value.usphone === 'string' ? value.usphone : '',
    ukphone: typeof value.ukphone === 'string' ? value.ukphone : '',
    ...(typeof value.notation === 'string' ? { notation: value.notation } : {}),
  }
}

export function normalizeWordList(value: unknown): Word[] {
  if (!Array.isArray(value)) return []
  return value.map(normalizeWord).filter((word): word is Word => word !== null)
}

export async function wordListFetcher(url: string): Promise<Word[]> {
  const response = await fetch(url.replace(/^\//, './'))
  if (!response.ok) throw new Error(`Failed to load dictionary: ${response.status}`)
  return normalizeWordList(await response.json())
}
