import { PracticeActionType, PracticeContext } from '../../store'
import MnemonicDetails from './components/MnemonicDetails'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import Tooltip from '@/components/Tooltip'
import type { WordPronunciationIconRef } from '@/components/WordPronunciationIcon'
import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { SoundIcon } from '@/components/WordPronunciationIcon/SoundIcon'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import {
  currentDictInfoAtom,
  hotkeysConfigAtom,
  isMnemonicEnabledAtom,
  isReviewModeAtom,
  isZenModeAtom,
  loopWordConfigAtom,
  pronunciationConfigAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import { emitHotkeyAction, useHotkeyAction } from '@/utils/hotkeyBus'
import { isHotkeyRecorderEvent } from '@/utils/hotkeys'
import { getWordMnemonic, prefetchWordExamples } from '@/utils/wordExample'
import type { WordExample, WordMnemonic } from '@/utils/wordExample'
import { useAtomValue, useSetAtom } from 'jotai'
import { ArrowLeftRight, Info } from 'lucide-react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

export default function WordPanel() {
  const { state, dispatch } = useContext(PracticeContext)!
  const [wordRenderKey, setWordRenderKey] = useState(0)
  const [repetitionIndex, setRepetitionIndex] = useState(0)
  const { times: loopWordTimes } = useAtomValue(loopWordConfigAtom)
  const activeWord = state.chapterData.words[state.chapterData.index]
  const activeWordName = activeWord?.name
  const shortcuts = useAtomValue(hotkeysConfigAtom)
  const currentDictionary = useAtomValue(currentDictInfoAtom)
  const languageCategory = currentDictionary.languageCategory
  const isZenMode = useAtomValue(isZenModeAtom)
  const isMnemonicEnabled = useAtomValue(isMnemonicEnabledAtom)
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const dictationSettings = useAtomValue(wordDictationConfigAtom)
  const [isWordComplete, setIsWordComplete] = useState(false)
  const shouldReadBefore = dictationSettings.isOpen
    ? (dictationSettings.isReadBefore ?? true)
    : (dictationSettings.isLearnReadBefore ?? dictationSettings.isReadBefore ?? true)
  const shouldReadAfter = dictationSettings.isOpen
    ? (dictationSettings.isReadAfter ?? true)
    : (dictationSettings.isLearnReadAfter ?? dictationSettings.isReadAfter ?? true)
  const shouldShowPronunciationButton = pronunciationConfig.isOpen && (shouldReadBefore || (isWordComplete && shouldReadAfter))
  const shouldShowPhonetic = shouldShowPronunciationButton
  const [activeExample, setActiveExample] = useState<WordExample | null>(null)
  const [wordMnemonic, setWordMnemonic] = useState<WordMnemonic | null>(null)
  const [showExample, setShowExample] = useState(false)
  const [isExamplePlaying, setIsExamplePlaying] = useState(false)
  const [isWordPlaying, setIsWordPlaying] = useState(false)
  const preferredPronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'
  const [displayedPronunciationType, setDisplayedPronunciationType] = useState<'us' | 'uk'>(preferredPronunciationType)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const usPronunciationIconRef = useRef<WordPronunciationIconRef>(null)
  const ukPronunciationIconRef = useRef<WordPronunciationIconRef>(null)
  const defaultPronunciationIconRef = useRef<WordPronunciationIconRef>(null)
  const toastTimerRef = useRef<number | null>(null)

  const getSelectedPronunciationIcon = useCallback(() => {
    if (pronunciationConfig.type === 'us') return usPronunciationIconRef.current
    if (pronunciationConfig.type === 'uk') return ukPronunciationIconRef.current
    return defaultPronunciationIconRef.current
  }, [pronunciationConfig.type])

  const stopAllPronunciations = useCallback(() => {
    usPronunciationIconRef.current?.stop()
    ukPronunciationIconRef.current?.stop()
    defaultPronunciationIconRef.current?.stop()
  }, [])

  const stopSelectedPronunciation = useCallback(() => {
    getSelectedPronunciationIcon()?.stop()
    if (displayedPronunciationType !== pronunciationConfig.type) {
      const displayedIcon = displayedPronunciationType === 'us' ? usPronunciationIconRef.current : ukPronunciationIconRef.current
      displayedIcon?.stop()
    }
  }, [displayedPronunciationType, getSelectedPronunciationIcon, pronunciationConfig.type])

  const toggleManualPronunciation = useCallback(
    (type: 'us' | 'uk') => {
      const targetIcon = type === 'us' ? usPronunciationIconRef.current : ukPronunciationIconRef.current
      const wasPlaying = targetIcon?.isPlaying ?? false
      emitHotkeyAction('stopWordPronunciation')
      stopAllPronunciations()
      if (!wasPlaying) targetIcon?.play()
    },
    [stopAllPronunciations],
  )

  const toggleDisplayedPronunciation = useCallback(() => {
    emitHotkeyAction('stopWordPronunciation')
    stopAllPronunciations()
    setDisplayedPronunciationType((current) => (current === 'us' ? 'uk' : 'us'))
  }, [stopAllPronunciations])

  useEffect(() => {
    setDisplayedPronunciationType(preferredPronunciationType)
  }, [activeWordName, preferredPronunciationType])

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToastMessage(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 1500)
  }, [])

  const setReviewSession = useSetAtom(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)

  const previousWordIndex = useMemo(() => {
    const candidateIndex = state.chapterData.index - 1
    return candidateIndex < 0 ? 0 : candidateIndex
  }, [state.chapterData.index])
  const nextWordIndex = useMemo(() => {
    const candidateIndex = state.chapterData.index + 1
    return candidateIndex > state.chapterData.words.length - 1 ? state.chapterData.words.length - 1 : candidateIndex
  }, [state.chapterData.index, state.chapterData.words.length])

  const upcomingWords = useMemo(() => {
    return state.chapterData.words.slice(state.chapterData.index + 1, state.chapterData.index + 3).map((word) => word.name)
  }, [state.chapterData.index, state.chapterData.words])

  usePrefetchPronunciationSound(upcomingWords)

  useEffect(() => {
    if (languageCategory !== 'en' || !activeWordName) return

    let isActive = true
    setWordMnemonic(null)
    void getWordMnemonic(activeWordName).then((nextMnemonic) => {
      if (isActive) setWordMnemonic(nextMnemonic)
    })

    return () => {
      isActive = false
    }
  }, [activeWordName, languageCategory])

  useEffect(() => {
    if (languageCategory !== 'en') return
    const nextWord = state.chapterData.words[state.chapterData.index + 1]
    if (!nextWord) return

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
    if (connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') return

    const timer = window.setTimeout(() => {
      void prefetchWordExamples([nextWord.name])
    }, 800)
    return () => window.clearTimeout(timer)
  }, [languageCategory, state.chapterData.index, state.chapterData.words])

  const refreshWordExercise = useCallback(() => {
    setWordRenderKey((renderKey) => renderKey + 1)
  }, [])

  const completeCurrentWord = useCallback(() => {
    if (state.chapterData.index < state.chapterData.words.length - 1 || repetitionIndex < loopWordTimes - 1) {
      // 用户完成当前单词
      if (repetitionIndex < loopWordTimes - 1) {
        setRepetitionIndex((currentIndex) => currentIndex + 1)
        dispatch({ type: PracticeActionType.LOOP_CURRENT_WORD })
        refreshWordExercise()
      } else {
        setRepetitionIndex(0)
        if (isReviewMode) {
          const nextIndex = state.chapterData.index + 1
          dispatch({ type: PracticeActionType.NEXT_WORD })
          setReviewSession((session) => ({
            ...session,
            reviewRecord: session.reviewRecord ? { ...session.reviewRecord, index: nextIndex } : undefined,
          }))
        } else {
          dispatch({ type: PracticeActionType.NEXT_WORD })
        }
      }
    } else {
      // 用户完成当前章节
      dispatch({ type: PracticeActionType.FINISH_CHAPTER })
      if (isReviewMode) {
        setReviewSession((session) => ({
          ...session,
          reviewRecord: session.reviewRecord ? { ...session.reviewRecord, isFinished: true } : undefined,
        }))
      }
    }
  }, [
    state.chapterData.index,
    state.chapterData.words.length,
    repetitionIndex,
    loopWordTimes,
    dispatch,
    refreshWordExercise,
    isReviewMode,
    setReviewSession,
  ])

  const moveToWord = useCallback(
    (direction: 'prev' | 'next') => {
      const currentIndex = state.chapterData.index
      const totalWords = state.chapterData.words.length

      if (direction === 'prev') {
        if (currentIndex === 0) {
          showToast('已是当前章节第一个单词')
          return
        }
        dispatch({ type: PracticeActionType.SKIP_2_WORD_INDEX, newIndex: previousWordIndex })
      }

      if (direction === 'next') {
        if (currentIndex >= totalWords - 1) {
          showToast('已是当前章节最后一个单词')
          return
        }
        dispatch({ type: PracticeActionType.SKIP_2_WORD_INDEX, newIndex: nextWordIndex })
      }
    },
    [dispatch, nextWordIndex, previousWordIndex, showToast, state.chapterData.index, state.chapterData.words.length],
  )

  useHotkeyAction('prevWord', () => moveToWord('prev'))
  useHotkeyAction('nextWord', () => moveToWord('next'))

  useHotkeys(
    shortcuts.prevWord || 'left,up',
    (e) => {
      e.preventDefault()
      moveToWord('prev')
    },
    { enableOnFormTags: true, ignoreEventWhen: isHotkeyRecorderEvent },
    [moveToWord, shortcuts.prevWord],
  )

  useHotkeys(
    shortcuts.nextWord || 'right,down',
    (e) => {
      e.preventDefault()
      moveToWord('next')
    },
    { enableOnFormTags: true, ignoreEventWhen: isHotkeyRecorderEvent },
    [moveToWord, shortcuts.nextWord],
  )

  const [isTranslationHovered, setIsTranslationHovered] = useState(false)

  const setTranslationHover = useCallback((hovered: boolean) => {
    setIsTranslationHovered(hovered)
  }, [])

  const shouldShowTranslation = useMemo(() => {
    return isTranslationHovered || state.isTransVisible
  }, [isTranslationHovered, state.isTransVisible])
  const shouldShowMnemonicDetails =
    isMnemonicEnabled && languageCategory === 'en' && (!dictationSettings.isOpen || isWordComplete)

  return (
    <div className="relative container flex h-full w-full flex-col items-center justify-center">
      {toastMessage && (
        <div
          role="status"
          className="animate__animated animate__fadeIn animate__faster pointer-events-none fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-raised)] px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-md select-none"
        >
          <Info className="h-4 w-4 text-[var(--primary)]" />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="container flex flex-grow flex-col items-center justify-center">
        {activeWord && (
          <div className="relative flex w-full justify-center">
            {!state.isTyping && (
              <div className="practice-start-overlay absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex w-full items-center">
                  <p className="practice-start-prompt w-full text-center text-xl font-medium select-none">
                    按任意键{state.timerData.time ? '继续' : '开始'}
                  </p>
                </div>
              </div>
            )}
            <div className="relative mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 md:max-w-[760px]">
              <WordComponent
                word={activeWord}
                onFinish={completeCurrentWord}
                onExampleChange={setActiveExample}
                onExampleVisibilityChange={setShowExample}
                onCompletionChange={setIsWordComplete}
                onExamplePlayingChange={setIsExamplePlaying}
                onWordPlayingChange={setIsWordPlaying}
                stopSelectedPronunciation={stopSelectedPronunciation}
                key={`${state.chapterData.index}-${wordRenderKey}`}
              />
              {languageCategory === 'en' ? (
                <div className="mt-2 flex min-h-5 w-full items-center justify-center gap-2 empty:hidden">
                  {shouldShowPhonetic && (
                      <button
                        type="button"
                        onClick={toggleDisplayedPronunciation}
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--muted)] transition-colors hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] focus-visible:outline-none"
                        aria-label={`临时查看${displayedPronunciationType === 'us' ? '英音' : '美音'}音标`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                  )}
                  {shouldShowPhonetic && <Phonetic word={activeWord} type={displayedPronunciationType} />}
                  {shouldShowPronunciationButton && (
                    <WordPronunciationIcon
                      word={activeWord}
                      lang={currentDictionary.language}
                      pronunciationType={displayedPronunciationType}
                      ref={displayedPronunciationType === 'us' ? usPronunciationIconRef : ukPronunciationIconRef}
                      isPlaying={isWordPlaying && pronunciationConfig.type === displayedPronunciationType}
                      onClick={() => toggleManualPronunciation(displayedPronunciationType)}
                      ariaLabel={`播放${displayedPronunciationType === 'us' ? '美音' : '英音'}`}
                      className="h-5 w-5 shrink-0"
                    />
                  )}
                </div>
              ) : (
                <div className="mt-2 flex min-h-5 w-full items-center justify-center empty:hidden">
                  {shouldShowPronunciationButton && (
                    <WordPronunciationIcon
                      word={activeWord}
                      lang={currentDictionary.language}
                      ref={defaultPronunciationIconRef}
                      isPlaying={isWordPlaying}
                      onClick={() => emitHotkeyAction('playPause')}
                      ariaLabel="播放发音"
                      className="h-5 w-5 shrink-0"
                    />
                  )}
                </div>
              )}
              {languageCategory !== 'en' && (
                <Translation
                  trans={activeWord.trans}
                  showTrans={shouldShowTranslation}
                  onMouseEnter={() => setTranslationHover(true)}
                  onMouseLeave={() => setTranslationHover(false)}
                />
              )}
              {shouldShowMnemonicDetails && (
                <div className="w-full" onMouseEnter={() => setTranslationHover(true)} onMouseLeave={() => setTranslationHover(false)}>
                  <MnemonicDetails
                    word={activeWord.name}
                    translations={activeWord.trans}
                    showMeaning={isZenMode || shouldShowTranslation}
                    mnemonic={wordMnemonic}
                    part="meaning"
                  />
                </div>
              )}
              {languageCategory === 'en' && (
                <div className="flex min-h-[6rem] w-full max-w-xl shrink-0 items-start justify-center px-2 pt-1 text-center md:max-w-2xl">
                  {shouldReadAfter && showExample && activeExample && (
                    <div
                      className="animate__animated animate__fadeIn flex items-center justify-center gap-2 select-none"
                      aria-live="polite"
                    >
                      <div>
                        <p className="text-base leading-7 font-medium text-[var(--body)]">{activeExample.english}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{activeExample.chinese}</p>
                      </div>
                      <Tooltip content="朗读例句" className="ml-1.5 h-5 w-5 shrink-0 cursor-pointer">
                        <SoundIcon
                          animated={isExamplePlaying}
                          onClick={() => emitHotkeyAction('playExample')}
                          className="h-5 w-5"
                          ariaLabel="朗读例句"
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}
              {shouldShowMnemonicDetails && (
                <div className="w-full">
                  <MnemonicDetails
                    word={activeWord.name}
                    translations={activeWord.trans}
                    showMeaning={isZenMode || shouldShowTranslation}
                    mnemonic={wordMnemonic}
                    part="memory"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
