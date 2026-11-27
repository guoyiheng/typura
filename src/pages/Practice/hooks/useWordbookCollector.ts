import { WORDBOOK_AUTO_DICTATION_COUNT } from '@/constants'
import { WORDBOOK_DICT_ID } from '@/resources/wordbook'
import { currentDictInfoAtom, wordStatsAtom } from '@/store'
import { normalizeWordbookEntries, upsertWordbookEntry, wordbookAtom } from '@/store/wordbook'
import type { Word } from '@/typings'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { createWordbookEntry } from '@/utils/wordbook'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import useSWR from 'swr'

const BACKFILLED_DICTS_KEY = 'wordbookAutoFillDicts'

function readBackfilledDicts(): string[] {
  try {
    const raw = window.localStorage.getItem(BACKFILLED_DICTS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : undefined
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function markDictBackfilled(dictId: string) {
  try {
    const dicts = readBackfilledDicts()
    if (dicts.includes(dictId)) return
    window.localStorage.setItem(BACKFILLED_DICTS_KEY, JSON.stringify([...dicts, dictId]))
  } catch (error) {
    console.error(error)
  }
}

/** 把单词收进生词本，已收藏时保持不变。 */
export function useAddWordToWordbook() {
  const setWordbook = useSetAtom(wordbookAtom)
  const dictionary = useAtomValue(currentDictInfoAtom)

  return useCallback(
    (word: Word) => {
      const entry = createWordbookEntry(word, dictionary)

      setWordbook((entries) => {
        if (entries.some((item) => item.word === entry.word)) return entries
        return upsertWordbookEntry(normalizeWordbookEntries(entries), entry)
      })
    },
    [dictionary, setWordbook],
  )
}

/**
 * 默写过的单词会自动进入生词本，这里为已经达标的旧数据补一次。
 * 每个词典只补一次，避免用户手动移除后又被加回来。
 */
export function useWordbookDictationBackfill() {
  const dictionary = useAtomValue(currentDictInfoAtom)
  const wordStats = useAtomValue(wordStatsAtom)
  const addWordToWordbook = useAddWordToWordbook()
  const isBookMode = dictionary.contentType === 'book'
  const isWordbookDict = dictionary.id === WORDBOOK_DICT_ID
  const { data: wordList } = useSWR(isBookMode || isWordbookDict ? null : dictionary.url, wordListFetcher)

  useEffect(() => {
    if (!wordList || wordList.length === 0) return
    if (readBackfilledDicts().includes(dictionary.id)) return

    const dictationWords = wordList.filter((word) => (wordStats[word.name]?.dictationCount ?? 0) >= WORDBOOK_AUTO_DICTATION_COUNT)
    markDictBackfilled(dictionary.id)
    dictationWords.forEach(addWordToWordbook)
  }, [addWordToWordbook, dictionary.id, wordList, wordStats])
}
