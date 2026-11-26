import { idDictionaryMap } from '@/resources/dictionary'
import type { LanguageCategoryType, LanguageType } from '@/typings'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type WordbookEntry = {
  /** 单词文本，同时作为生词本内的唯一标识 */
  word: string
  /** 释义 */
  trans: string[]
  /** 音标 */
  usphone: string
  ukphone: string
  /** 来源词典 id */
  dictId: string
  /** 来源词典名称 */
  dictName: string
  /** 来源词典的语言设置，用于决定生词本的练习语言 */
  language: LanguageType
  languageCategory: LanguageCategoryType
  /** 收藏时间戳 */
  addedAt: number
}

type WordbookEntryRef = Pick<WordbookEntry, 'word'>

export const wordbookAtom = atomWithStorage<WordbookEntry[]>('wordbook', [], undefined, { getOnInit: true })

export function getWordbookEntryKey(entry: WordbookEntryRef): string {
  return entry.word
}

/** 修复历史数据并去掉重复单词，最新的收藏排在最前。 */
export function normalizeWordbookEntries(value: unknown): WordbookEntry[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const entries: WordbookEntry[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue

    const raw = item as Partial<WordbookEntry> & { dictId?: string }
    const word = typeof raw.word === 'string' ? raw.word : ''
    if (!word || seen.has(word)) continue

    const sourceDict = raw.dictId ? idDictionaryMap[raw.dictId] : undefined

    seen.add(word)
    entries.push({
      word,
      trans: Array.isArray(raw.trans) ? raw.trans.filter((trans): trans is string => typeof trans === 'string') : [],
      usphone: typeof raw.usphone === 'string' ? raw.usphone : '',
      ukphone: typeof raw.ukphone === 'string' ? raw.ukphone : '',
      dictId: raw.dictId ?? '',
      dictName: typeof raw.dictName === 'string' && raw.dictName ? raw.dictName : (sourceDict?.name ?? ''),
      language: raw.language ?? sourceDict?.language ?? 'en',
      languageCategory: raw.languageCategory ?? sourceDict?.languageCategory ?? 'en',
      addedAt: typeof raw.addedAt === 'number' ? raw.addedAt : 0,
    })
  }

  return entries.sort((a, b) => b.addedAt - a.addedAt)
}

/** 已归一化的生词本内容，作为只读数据源使用。 */
export const wordbookEntriesAtom = atom((get) => normalizeWordbookEntries(get(wordbookAtom)))

/** 新收藏的单词排在最前，已有记录则更新为最新信息。 */
export function upsertWordbookEntry(entries: WordbookEntry[], entry: WordbookEntry): WordbookEntry[] {
  const key = getWordbookEntryKey(entry)

  return [entry, ...entries.filter((item) => getWordbookEntryKey(item) !== key)]
}

export function removeWordbookEntry(entries: WordbookEntry[], entry: WordbookEntryRef): WordbookEntry[] {
  const key = getWordbookEntryKey(entry)

  return entries.filter((item) => getWordbookEntryKey(item) !== key)
}
