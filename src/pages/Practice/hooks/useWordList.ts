import { getBookChapterWords } from '@/resources/books'
import { chapterLengthAtom, currentChapterAtom, currentDictInfoAtom, reviewModeInfoAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings/index'
import { getDictionaryChapter } from '@/utils'
import { normalizeWordList, wordListFetcher } from '@/utils/wordListFetcher'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useMemo } from 'react'
import useSWR from 'swr'

export type UseWordListResult = {
  words: WordWithIndex[]
  isLoading: boolean
  error: Error | undefined
}

/**
 * Use word lists from the current selected dictionary.
 */
export function useWordList(): UseWordListResult {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const chapterLength = useAtomValue(chapterLengthAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const { isReviewMode, reviewRecord } = useAtomValue(reviewModeInfoAtom)
  const isBookMode = currentDictInfo.contentType === 'book'

  useEffect(() => {
    if (!isReviewMode && currentChapter >= currentDictInfo.chapterCount) {
      setCurrentChapter(0)
    }
  }, [currentChapter, currentDictInfo.chapterCount, isReviewMode, setCurrentChapter])

  const { data: wordList, error, isLoading } = useSWR(isBookMode ? null : currentDictInfo.url, wordListFetcher)

  const words: WordWithIndex[] = useMemo(() => {
    let newWords: Word[]
    if (isReviewMode) {
      newWords = reviewRecord?.words ?? []
    } else if (isBookMode) {
      newWords = getBookChapterWords(currentDictInfo.id, currentChapter)
    } else if (wordList) {
      const chapter = getDictionaryChapter(currentDictInfo, currentChapter, chapterLength)
      newWords = chapter ? wordList.slice(chapter.start, chapter.end) : []
    } else {
      newWords = []
    }

    return normalizeWordList(newWords).map((word, index) => ({ ...word, index }))
  }, [isReviewMode, isBookMode, wordList, reviewRecord?.words, currentDictInfo, currentChapter, chapterLength])

  return { words, isLoading: isBookMode ? false : isLoading, error }
}
