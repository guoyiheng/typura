import { currentDictInfoAtom } from '@/store'
import { normalizeWordbookEntries, upsertWordbookEntry, wordbookAtom } from '@/store/wordbook'
import type { Word } from '@/typings'
import { createWordbookEntry } from '@/utils/wordbook'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

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
