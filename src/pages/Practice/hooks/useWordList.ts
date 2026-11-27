import { getBookChapterWords } from '@/resources/books'
import { WORDBOOK_DICT_ID } from '@/resources/wordbook'
import { chapterLengthAtom, currentChapterAtom, currentDictInfoAtom, reviewModeInfoAtom, wordbookEntriesAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings/index'
import { getDictionaryChapter } from '@/utils'
import { normalizeWordList, wordListFetcher } from '@/utils/wordListFetcher'
import { wordbookEntryToWord } from '@/utils/wordbook'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useMemo } from 'react'
import useSWR from 'swr'

export type UseWordListResult = {
  words: WordWithIndex[]
  isLoading: boolean
  error: Error | undefined
}

/** 保持引用稳定：非生词本词典时，生词本变化不应该让词表重新生成。 */
const EMPTY_WORDS: Word[] = []

/**
 * Use word lists from the current selected dictionary.
 */
export function useWordList(): UseWordListResult {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const chapterLength = useAtomValue(chapterLengthAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const { isReviewMode, reviewRecord } = useAtomValue(reviewModeInfoAtom)
  const wordbookEntries = useAtomValue(wordbookEntriesAtom)
  const isBookMode = currentDictInfo.contentType === 'book'
  const isWordbookDict = currentDictInfo.id === WORDBOOK_DICT_ID

  useEffect(() => {
    if (isReviewMode) return
    if (currentDictInfo.chapterCount > 0 && currentChapter >= currentDictInfo.chapterCount) {
      setCurrentChapter(0)
    }
  }, [currentChapter, currentDictInfo.chapterCount, isReviewMode, setCurrentChapter])

  const { data: wordList, error, isLoading } = useSWR(isBookMode || isWordbookDict ? null : currentDictInfo.url, wordListFetcher)

  const wordbookWords = useMemo(
    () => (isWordbookDict ? wordbookEntries.map(wordbookEntryToWord) : EMPTY_WORDS),
    [isWordbookDict, wordbookEntries],
  )

  const words: WordWithIndex[] = useMemo(() => {
    let newWords: Word[]
    if (isReviewMode) {
      newWords = reviewRecord?.words ?? []
    } else if (isWordbookDict) {
      const chapter = getDictionaryChapter(currentDictInfo, currentChapter, chapterLength)
      newWords = chapter ? wordbookWords.slice(chapter.start, chapter.end) : []
    } else if (isBookMode) {
      newWords = getBookChapterWords(currentDictInfo.id, currentChapter)
    } else if (wordList) {
      const chapter = getDictionaryChapter(currentDictInfo, currentChapter, chapterLength)
      newWords = chapter ? wordList.slice(chapter.start, chapter.end) : []
    } else {
      newWords = []
    }

    return normalizeWordList(newWords).map((word, index) => ({ ...word, index }))
  }, [
    isReviewMode,
    isBookMode,
    isWordbookDict,
    wordList,
    wordbookWords,
    reviewRecord?.words,
    currentDictInfo,
    currentChapter,
    chapterLength,
  ])

  return { words, isLoading: isBookMode || isWordbookDict ? false : isLoading, error }
}
