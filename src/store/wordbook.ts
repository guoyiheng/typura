import { atomWithStorage } from 'jotai/utils'

export type WordbookEntry = {
  /** 单词文本 */
  word: string
  /** 释义 */
  trans: string[]
  /** 来源词典 id */
  dictId: string
  /** 来源词典名称 */
  dictName: string
  /** 来源章节序号 */
  chapter: number
  /** 单词在章节原始词表中的序号 */
  wordIndex: number
  /** 收藏时间戳 */
  addedAt: number
}

type WordbookEntryRef = Pick<WordbookEntry, 'dictId' | 'word'>

export const wordbookAtom = atomWithStorage<WordbookEntry[]>('wordbook', [], undefined, { getOnInit: true })

export function getWordbookEntryKey(entry: WordbookEntryRef): string {
  return `${entry.dictId}::${entry.word}`
}

/** 新收藏的单词排在最前，已有记录则更新为最新信息。 */
export function upsertWordbookEntry(entries: WordbookEntry[], entry: WordbookEntry): WordbookEntry[] {
  const key = getWordbookEntryKey(entry)

  return [entry, ...entries.filter((item) => getWordbookEntryKey(item) !== key)]
}

export function removeWordbookEntry(entries: WordbookEntry[], entry: WordbookEntryRef): WordbookEntry[] {
  const key = getWordbookEntryKey(entry)

  return entries.filter((item) => getWordbookEntryKey(item) !== key)
}
