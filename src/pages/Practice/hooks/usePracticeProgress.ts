import type { PracticeAction } from '../store'
import { PracticeActionType as ActionType } from '../store'
import type { PracticeSessionState } from '../store/type'
import {
  currentChapterAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  dictationProgressAtom,
  learnProgressAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import type { WordWithIndex } from '@/typings'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useRef } from 'react'

const clampIndex = (index: number, wordsLength: number) => Math.max(0, Math.min(index, Math.max(wordsLength - 1, 0)))

export function useRestorePracticeProgress({
  words,
  dispatch,
  shouldShuffle,
}: {
  words: WordWithIndex[]
  dispatch: (action: PracticeAction) => void
  shouldShuffle: boolean
}) {
  const currentDictId = useAtomValue(currentDictIdAtom)
  const currentDictionary = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const { isReviewMode, reviewRecord } = reviewModeInfo
  const wordDictationConfig = useAtomValue(wordDictationConfigAtom)
  const isDictationMode = wordDictationConfig.isOpen

  const learnProgress = useAtomValue(learnProgressAtom)
  const dictationProgress = useAtomValue(dictationProgressAtom)

  const activeProgressMap = isDictationMode ? dictationProgress : learnProgress
  const currentProgress = activeProgressMap[currentDictId]

  const initializedRef = useRef<{ sessionKey: string; words: WordWithIndex[] } | undefined>(undefined)

  useEffect(() => {
    if (words.length === 0) return

    if (isReviewMode) {
      const recordKey = reviewRecord?.id ?? reviewRecord?.createTime ?? 'unsaved'
      const sessionKey = `${currentDictId}:review:${recordKey}`
      const initialized = initializedRef.current
      if (initialized?.sessionKey === sessionKey && initialized.words === words) return

      dispatch({
        type: ActionType.SETUP_CHAPTER,
        payload: {
          words,
          shouldShuffle: false,
          initialIndex: clampIndex(reviewRecord?.index ?? 0, words.length),
        },
      })
      initializedRef.current = { sessionKey, words }
      return
    }

    const savedChapter = (currentProgress?.chapter ?? 0) % Math.max(currentDictionary.chapterCount, 1)
    const savedIndex = currentProgress?.index ?? 0

    // 如果存的章节与当前章节不同，并且刚加载/切换模式，将 currentChapter 修正为 savedChapter
    if (currentChapter !== savedChapter && !initializedRef.current) {
      setCurrentChapter(savedChapter)
      return
    }

    const sessionKey = `${currentDictId}:${currentChapter}:${isDictationMode ? 'dictation' : 'learn'}`
    const initialized = initializedRef.current
    if (initialized?.sessionKey === sessionKey && initialized.words === words) return

    const initialIndex = currentChapter === savedChapter ? savedIndex : 0

    dispatch({
      type: ActionType.SETUP_CHAPTER,
      payload: {
        words,
        shouldShuffle,
        initialIndex: clampIndex(initialIndex, words.length),
      },
    })
    initializedRef.current = { sessionKey, words }
  }, [
    currentChapter,
    currentDictionary.chapterCount,
    currentDictId,
    currentProgress,
    dispatch,
    isDictationMode,
    isReviewMode,
    reviewRecord?.createTime,
    reviewRecord?.id,
    reviewRecord?.index,
    setCurrentChapter,
    shouldShuffle,
    words,
  ])
}

export function usePersistPracticeProgress(state: PracticeSessionState, words: WordWithIndex[]) {
  const currentDictId = useAtomValue(currentDictIdAtom)
  const currentDictionary = useAtomValue(currentDictInfoAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const isReviewMode = useAtomValue(reviewModeInfoAtom).isReviewMode

  const wordDictationConfig = useAtomValue(wordDictationConfigAtom)
  const isDictationMode = wordDictationConfig.isOpen

  const setLearnProgress = useSetAtom(learnProgressAtom)
  const setDictationProgress = useSetAtom(dictationProgressAtom)

  const lastSavedRef = useRef<{ key: string; index: number; chapter: number } | undefined>(undefined)

  useEffect(() => {
    const isCurrentWordList =
      state.chapterData.words.length === words.length && state.chapterData.words.every((word) => words.includes(word))
    if (isReviewMode || words.length === 0 || !isCurrentWordList) return

    const targetChapter = currentChapter
    const targetIndex = state.chapterData.index

    const saveKey = `${currentDictId}:${isDictationMode ? 'dictation' : 'learn'}`
    const lastSaved = lastSavedRef.current
    if (lastSaved?.key === saveKey && lastSaved.chapter === targetChapter && lastSaved.index === targetIndex) return

    const setter = isDictationMode ? setDictationProgress : setLearnProgress
    setter((previous) => {
      const prevItem = previous[currentDictId]
      if (prevItem?.chapter === targetChapter && prevItem?.index === targetIndex) return previous

      return {
        ...previous,
        [currentDictId]: {
          chapter: targetChapter,
          index: targetIndex,
        },
      }
    })

    lastSavedRef.current = { key: saveKey, chapter: targetChapter, index: targetIndex }
  }, [
    currentChapter,
    currentDictionary.chapterCount,
    currentDictId,
    isDictationMode,
    isReviewMode,
    setDictationProgress,
    setLearnProgress,
    state.chapterData.index,
    state.chapterData.words,
    state.isFinished,
    words,
  ])
}
