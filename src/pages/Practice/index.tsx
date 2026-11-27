import Layout from '../../components/Layout'
import { BookFontSizeControl } from './components/BookFontSizeControl'
import BookPanel from './components/BookPanel'
import { DictChapterButton } from './components/DictChapterButton'
import ResultScreen from './components/ResultScreen'
import SessionMetrics from './components/SessionMetrics'
import SettingsMenu from './components/SettingsMenu'
import WordDictationSwitcher from './components/WordDictationSwitcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { WordStatusPanel } from './components/WordStatusPanel'
import WordbookButton from './components/WordbookButton'
import { useConfetti } from './hooks/useConfetti'
import { usePersistPracticeProgress, useRestorePracticeProgress } from './hooks/usePracticeProgress'
import { useWordList } from './hooks/useWordList'
import { PracticeActionType, PracticeContext, initialPracticeState, practiceReducer } from './store'
import type { PracticeAction } from './store'
import Header from '@/components/Header'
import { LoadingUI } from '@/components/Loading'
import Tooltip from '@/components/Tooltip'
import { idDictionaryMap } from '@/resources/dictionary'
import { WORDBOOK_DICT_ID, wordbookDictionary } from '@/resources/wordbook'
import {
  chapterLengthAtom,
  currentChapterAtom,
  currentChapterInfoAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  dictationProgressAtom,
  hotkeysConfigAtom,
  isReviewModeAtom,
  isWordbookDictAtom,
  isZenModeAtom,
  learnProgressAtom,
  masteryRoundsAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import {
  createDailyPracticeStats,
  dailyPracticeStatsAtom,
  getMillisecondsUntilNextPracticeDay,
  normalizeDailyPracticeStats,
} from '@/store/dailyPracticeStats'
import { recordMasteryEventAtom } from '@/store/mastery'
import type { WordbookEntry } from '@/store/wordbook'
import { normalizeWordbookEntries, removeWordbookEntry, upsertWordbookEntry, wordbookAtom, wordbookEntriesAtom } from '@/store/wordbook'
import { CTRL, IsDesktop, isLegal } from '@/utils'
import { useSaveChapterRecord } from '@/utils/db'
import { emitHotkeyAction, useHotkeyAction } from '@/utils/hotkeyBus'
import type { HotkeyAction } from '@/utils/hotkeyBus'
import { eventMatchesShortcut, formatShortcut, isEditableHotkeyTarget, isHotkeyRecorderEvent } from '@/utils/hotkeys'
import { MASTERY_ANSWER_EXPOSED_EVENT } from '@/utils/mastery'
import { createWordbookEntry, getDictionaryWordLocation, getWordbookChapterCount } from '@/utils/wordbook'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { BookmarkMinus, BookmarkPlus, Languages, Minimize2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

const PracticePage: React.FC = () => {
  const [state, practiceDispatch] = useImmerReducer(practiceReducer, structuredClone(initialPracticeState))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { words } = useWordList()

  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const currentChapterInfo = useAtomValue(currentChapterInfoAtom)
  const currentResource = useAtomValue(currentDictInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const [isZenMode, setIsZenMode] = useAtom(isZenModeAtom)
  const hotkeysConfig = useAtomValue(hotkeysConfigAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const setDailyPracticeStats = useSetAtom(dailyPracticeStatsAtom)
  const setWordDictationConfig = useSetAtom(wordDictationConfigAtom)
  const wordDictationConfig = useAtomValue(wordDictationConfigAtom)
  const setMasteryRounds = useSetAtom(masteryRoundsAtom)
  const recordMasteryEvent = useSetAtom(recordMasteryEventAtom)
  const saveChapterRecord = useSaveChapterRecord()
  const isBookMode = currentResource.contentType === 'book'
  const setWordbook = useSetAtom(wordbookAtom)
  const wordbookEntries = useAtomValue(wordbookEntriesAtom)
  const isWordbookDict = useAtomValue(isWordbookDictAtom)
  const chapterLength = useAtomValue(chapterLengthAtom)
  const learnProgress = useAtomValue(learnProgressAtom)
  const dictationProgress = useAtomValue(dictationProgressAtom)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const [pendingWordJump, setPendingWordJump] = useState<{ dictId: string; chapter: number; wordIndex: number; word: string } | null>(null)
  const [wordbookToast, setWordbookToast] = useState<{ message: string; tone: 'added' | 'removed' } | null>(null)
  const wordbookToastTimerRef = useRef<number | null>(null)
  const activeWord = state.chapterData.words[state.chapterData.index]

  const dispatch = useCallback(
    (action: PracticeAction) => {
      if (action.type === PracticeActionType.REPEAT_CHAPTER && state.masteryScope) {
        const roundKey = state.masteryScope
        setMasteryRounds((previous) => {
          if (!(roundKey in previous)) return previous
          const next = { ...previous }
          delete next[roundKey]
          return next
        })
      }
      practiceDispatch(action)

      switch (action.type) {
        case PracticeActionType.TICK_TIMER:
          setDailyPracticeStats((storedStats) => {
            const stats = normalizeDailyPracticeStats(storedStats)
            return { ...stats, time: stats.time + (action.addTime ?? 1) }
          })
          break
        case PracticeActionType.REPORT_CORRECT_WORD:
          setDailyPracticeStats((storedStats) => {
            const stats = normalizeDailyPracticeStats(storedStats)
            return { ...stats, correctKeystrokes: stats.correctKeystrokes + 1 }
          })
          break
        case PracticeActionType.REPORT_WRONG_WORD:
          setDailyPracticeStats((storedStats) => {
            const stats = normalizeDailyPracticeStats(storedStats)
            return { ...stats, wrongKeystrokes: stats.wrongKeystrokes + 1 }
          })
          break
        case PracticeActionType.REPORT_COMPLETED_WORD:
          setDailyPracticeStats((storedStats) => {
            const stats = normalizeDailyPracticeStats(storedStats)
            return {
              ...stats,
              attemptedWords: stats.attemptedWords + 1,
              correctWords: stats.correctWords + (action.payload.isCorrect ? 1 : 0),
            }
          })
          break
      }
    },
    [practiceDispatch, setDailyPracticeStats, setMasteryRounds, state.masteryScope],
  )

  useEffect(() => {
    const handleAnswerExposed = (event: Event) => {
      const word = (event as CustomEvent<{ word?: string }>).detail?.word
      if (!word || state.isFinished || !state.chapterData.words.some((item) => item.name === word)) return
      recordMasteryEvent({
        scope: state.masteryScope,
        word,
        event: 'expose',
        independent: wordDictationConfig.isOpen && wordDictationConfig.type === 'hideAll',
      })
    }
    window.addEventListener(MASTERY_ANSWER_EXPOSED_EVENT, handleAnswerExposed)
    return () => window.removeEventListener(MASTERY_ANSWER_EXPOSED_EVENT, handleAnswerExposed)
  }, [
    recordMasteryEvent,
    state.chapterData.words,
    state.isFinished,
    state.masteryScope,
    wordDictationConfig.isOpen,
    wordDictationConfig.type,
  ])

  useEffect(() => {
    let resetTimer: number

    const scheduleReset = () => {
      resetTimer = window.setTimeout(() => {
        setDailyPracticeStats(createDailyPracticeStats())
        scheduleReset()
      }, getMillisecondsUntilNextPracticeDay() + 50)
    }

    scheduleReset()
    return () => window.clearTimeout(resetTimer)
  }, [setDailyPracticeStats])

  useHotkeyAction('toggleTrans', () => dispatch({ type: PracticeActionType.TOGGLE_TRANS_VISIBLE }))
  useHotkeyAction('toggleZenMode', () => setIsZenMode((prev) => !prev))

  const showWordbookToast = useCallback((message: string, tone: 'added' | 'removed') => {
    if (wordbookToastTimerRef.current) window.clearTimeout(wordbookToastTimerRef.current)
    setWordbookToast({ message, tone })
    wordbookToastTimerRef.current = window.setTimeout(() => {
      setWordbookToast(null)
      wordbookToastTimerRef.current = null
    }, 1600)
  }, [])

  useEffect(() => {
    return () => {
      if (wordbookToastTimerRef.current) window.clearTimeout(wordbookToastTimerRef.current)
    }
  }, [])

  const wordbookChapterCount = getWordbookChapterCount(wordbookEntries.length, chapterLength)
  const isWordbookEmpty = isWordbookDict && wordbookEntries.length === 0

  const toggleWordbook = useCallback(() => {
    const word = state.chapterData.words[state.chapterData.index]
    if (!word || state.isFinished) return

    const isCollected = wordbookEntries.some((entry) => entry.word === word.name)
    if (isCollected) {
      setWordbook((entries) => removeWordbookEntry(normalizeWordbookEntries(entries), { word: word.name }))
      showWordbookToast(`已将 ${word.name} 移出生词本`, 'removed')
      return
    }

    // 生词本里的单词都来自收藏，不需要再入库一次。
    if (isWordbookDict) return

    setWordbook((entries) => upsertWordbookEntry(normalizeWordbookEntries(entries), createWordbookEntry(word, currentResource)))
    showWordbookToast(`已将 ${word.name} 加入生词本`, 'added')
  }, [
    currentResource,
    isWordbookDict,
    setWordbook,
    showWordbookToast,
    state.chapterData.index,
    state.chapterData.words,
    state.isFinished,
    wordbookEntries,
  ])

  const removeWordbookItem = useCallback(
    (entry: WordbookEntry) => {
      setWordbook((entries) => removeWordbookEntry(normalizeWordbookEntries(entries), entry))
      showWordbookToast(`已将 ${entry.word} 移出生词本`, 'removed')
    },
    [setWordbook, showWordbookToast],
  )

  // 生词本本身是一个词典：进入后可以像普通词典一样按章节练习。
  const openWordbookPractice = useCallback(
    (targetWord?: string) => {
      if (wordbookEntries.length === 0) return

      const resource = { ...wordbookDictionary, length: wordbookEntries.length }
      const savedProgress = (wordDictationConfig.isOpen ? dictationProgress : learnProgress)[WORDBOOK_DICT_ID]
      const savedChapter = Math.min(Math.max(0, savedProgress?.chapter ?? 0), Math.max(0, wordbookChapterCount - 1))
      const targetLocation = targetWord
        ? getDictionaryWordLocation(
            resource,
            wordbookEntries.findIndex((entry) => entry.word === targetWord),
            chapterLength,
          )
        : undefined
      const targetChapter = targetLocation?.chapter ?? savedChapter
      const targetIndex = targetLocation ? targetLocation.wordIndex : (savedProgress?.index ?? 0)

      if (isReviewMode) setReviewModeInfo({ isReviewMode: false, reviewRecord: undefined })
      setCurrentDictId(WORDBOOK_DICT_ID)
      setCurrentChapter(targetChapter)
      setPendingWordJump(
        targetLocation ? { dictId: WORDBOOK_DICT_ID, chapter: targetChapter, wordIndex: targetIndex, word: targetWord ?? '' } : null,
      )
    },
    [
      chapterLength,
      dictationProgress,
      isReviewMode,
      learnProgress,
      setCurrentChapter,
      setCurrentDictId,
      setPendingWordJump,
      setReviewModeInfo,
      wordDictationConfig.isOpen,
      wordbookChapterCount,
      wordbookEntries,
    ],
  )

  // 词典、章节都与生词来源一致后，再跳到该单词所在的位置。
  useEffect(() => {
    if (!pendingWordJump) return
    if (pendingWordJump.dictId !== currentDictId || pendingWordJump.chapter !== currentChapter) return

    const chapterWords = state.chapterData.words
    const expectedScope = `${currentDictId}:chapter:${currentChapter}:size:${chapterLength}`
    if (chapterWords.length === 0 || state.masteryScope !== expectedScope) return

    const matchedIndex = chapterWords.findIndex((word) => word.index === pendingWordJump.wordIndex)
    const targetIndex =
      matchedIndex >= 0 && chapterWords[matchedIndex].name === pendingWordJump.word
        ? matchedIndex
        : chapterWords.findIndex((word) => word.name === pendingWordJump.word)

    setPendingWordJump(null)
    if (targetIndex < 0) return

    if (state.isFinished) {
      dispatch({
        type: PracticeActionType.SETUP_CHAPTER,
        payload: { words: chapterWords, masteryScope: state.masteryScope, shouldShuffle: false, initialIndex: targetIndex },
      })
      return
    }

    dispatch({ type: PracticeActionType.SKIP_2_WORD_INDEX, newIndex: targetIndex })
  }, [
    chapterLength,
    currentChapter,
    currentDictId,
    dispatch,
    pendingWordJump,
    state.chapterData.words,
    state.isFinished,
    state.masteryScope,
  ])

  useHotkeyAction('addToWordbook', toggleWordbook)

  useEffect(() => {
    // 全局快捷键在捕获阶段统一消费，避免数字按键同时被写进单词输入。
    const globalShortcuts: Array<{ shortcut: string; action: HotkeyAction }> = [
      { shortcut: hotkeysConfig.toggleZenMode, action: 'toggleZenMode' },
      { shortcut: hotkeysConfig.playPause, action: 'playPause' },
      { shortcut: hotkeysConfig.hint, action: 'hint' },
      { shortcut: hotkeysConfig.addToWordbook, action: 'addToWordbook' },
    ]

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isHotkeyRecorderEvent(e) || isEditableHotkeyTarget(e.target)) return

      if ((e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) && isZenMode) {
        e.preventDefault()
        e.stopPropagation()
        setIsZenMode(false)
        return
      }

      const activeWordName = state.chapterData.words[state.chapterData.index]?.name ?? ''
      const isTypingActiveWordCharacter =
        state.isTyping &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        activeWordName.toLowerCase().includes(e.key.toLowerCase())
      if (isTypingActiveWordCharacter) return

      const matched = globalShortcuts.find(({ shortcut }) => eventMatchesShortcut(e, shortcut))
      if (!matched) return

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      emitHotkeyAction(matched.action)
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [
    hotkeysConfig.addToWordbook,
    hotkeysConfig.hint,
    hotkeysConfig.playPause,
    hotkeysConfig.toggleZenMode,
    isZenMode,
    setIsZenMode,
    state.chapterData.index,
    state.chapterData.words,
    state.isTyping,
  ])

  useEffect(() => {
    // 检测用户设备
    if (!IsDesktop()) {
      setTimeout(() => {
        alert('Typura 的练习交互需要实体键盘。建议使用桌面端浏览器，平板设备可连接外接键盘后继续。')
      }, 500)
    }
  }, [])

  // 在组件挂载和currentDictId改变时，检查当前字典是否存在，如果不存在，则将其重置为默认值
  useEffect(() => {
    const id = currentDictId
    if (!(id in idDictionaryMap)) {
      setCurrentDictId('IELTSVocabularyBible')
      setCurrentChapter(0)
      return
    }
  }, [currentDictId, setCurrentChapter, setCurrentDictId])

  useEffect(() => {
    if (!isBookMode) return
    setWordDictationConfig((current) => (current.isOpen ? { ...current, isOpen: false, openBy: 'user' } : current))
  }, [isBookMode, setWordDictationConfig])

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: PracticeActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    setIsLoading(state.chapterData.words.length === 0)
  }, [state.chapterData.words])

  useEffect(() => {
    if (!state.isTyping) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          dispatch({ type: PracticeActionType.SET_IS_TYPING, payload: true })
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [state.isTyping, isLoading, dispatch])

  useRestorePracticeProgress({ words, dispatch, shouldShuffle: !isBookMode && randomConfig.isOpen, restartCount: state.restartCount })
  usePersistPracticeProgress(state, words)

  useEffect(() => {
    // 当用户完成章节且单词记录保存完毕后，记录本章结果。下一步由结果页操作决定。
    if (state.isFinished && !state.isSavingRecord) {
      saveChapterRecord(state)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFinished, state.isSavingRecord])

  useEffect(() => {
    // 启动计时器
    let intervalId: number
    if (state.isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: PracticeActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [state.isTyping, dispatch])

  useConfetti(state.isFinished)

  const chapterLabel = isReviewMode ? '错题复习' : (currentChapterInfo?.name ?? `第 ${currentChapter + 1} 章`)
  const currentWordPosition = Math.min(state.chapterData.index + 1, state.chapterData.words.length)

  return (
    <PracticeContext.Provider value={{ state, dispatch }}>
      {state.isFinished && <ResultScreen />}
      {wordbookToast && (
        <div
          role="status"
          className="animate__animated animate__fadeIn animate__faster pointer-events-none fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-raised)] px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-md select-none"
        >
          {wordbookToast.tone === 'added' ? (
            <BookmarkPlus className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          ) : (
            <BookmarkMinus className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
          )}
          <span>{wordbookToast.message}</span>
        </div>
      )}
      <Layout>
        {/* 导航 */}
        {!isZenMode && (
          <Header>
            <div className="flex min-w-0 items-center gap-1">
              <WordbookButton
                entries={wordbookEntries}
                isActive={isWordbookDict}
                currentEntryKey={activeWord?.name}
                addShortcutLabel={formatShortcut(hotkeysConfig.addToWordbook)}
                onRemove={removeWordbookItem}
                onSelect={(entry) => openWordbookPractice(entry.word)}
                onPractice={() => openWordbookPractice()}
              />
            </div>

            <span className="top-nav__divider" aria-hidden="true" />

            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <DictChapterButton />
              {!isBookMode && <WordList />}
            </div>

            <span className="top-nav__divider" aria-hidden="true" />

            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {!isBookMode && <WordDictationSwitcher />}
              {isBookMode ? (
                <BookFontSizeControl />
              ) : (
                <Tooltip content={`开关释义显示 (${CTRL} + Shift + V)`} placement="bottom">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: PracticeActionType.TOGGLE_TRANS_VISIBLE })}
                    className={`icon-button ${state.isTransVisible ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}
                    aria-label="开关释义显示"
                    aria-pressed={state.isTransVisible}
                  >
                    {state.isTransVisible ? (
                      <Languages className="h-[18px] w-[18px]" />
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <Languages className="h-[18px] w-[18px] opacity-45" />
                        <span className="absolute h-[1.5px] w-[18px] rotate-[45deg] bg-[var(--muted)]" />
                      </div>
                    )}
                  </button>
                </Tooltip>
              )}
            </div>

            <SettingsMenu />
          </Header>
        )}
        <div className="practice-layout flex h-full w-full flex-1 items-center justify-center">
          <div
            className={`practice-workspace ${isZenMode ? 'practice-workspace--zen' : ''} ${isBookMode ? 'practice-workspace--book' : ''}`}
          >
            <div
              className={`practice-column relative flex h-full w-full min-w-0 flex-col items-center justify-self-center ${
                isBookMode ? 'max-w-[1080px]' : 'max-w-[900px]'
              }`}
            >
              <section className={`practice-stage w-full ${isBookMode ? 'practice-stage--book' : ''}`} aria-label="当前练习">
                <div className="practice-stage__body">
                  {isWordbookEmpty ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                      <BookmarkPlus className="h-7 w-7 text-[var(--muted)]" aria-hidden="true" />
                      <p className="text-lg font-semibold text-[var(--ink)]">生词本里还没有单词</p>
                      <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
                        练习时按{' '}
                        <kbd className="rounded border border-[var(--line-strong)] bg-[var(--surface)] px-1 py-0.5 font-mono text-[11px] font-semibold">
                          {formatShortcut(hotkeysConfig.addToWordbook)}
                        </kbd>{' '}
                        收藏想再练的单词，它们会按收藏顺序出现在这里。
                      </p>
                      <NavLink to="/library" className="secondary-button mt-1">
                        去选一本词典
                      </NavLink>
                    </div>
                  ) : isLoading ? (
                    <LoadingUI />
                  ) : (
                    !state.isFinished && (isBookMode ? <BookPanel /> : <WordPanel key={state.restartCount} />)
                  )}
                </div>
              </section>
              {!isBookMode && !isZenMode && !state.isFinished && (
                <WordStatusPanel word={state.chapterData.words[state.chapterData.index]} />
              )}
              {!isZenMode && <SessionMetrics />}
            </div>
          </div>
        </div>
      </Layout>
      {/* 禅模式退出按钮 */}
      {isZenMode && (
        <>
          {!isLoading && !state.isFinished && (
            <div
              className={`zen-progress ${isBookMode ? 'zen-progress--book' : ''}`}
              aria-label={`${chapterLabel}，第 ${currentWordPosition} 个单词，共 ${state.chapterData.words.length} 个`}
            >
              <span className="zen-progress__chapter">{chapterLabel}</span>
              <span className="zen-progress__separator" aria-hidden="true" />
              <span className="zen-progress__position">
                {currentWordPosition} / {state.chapterData.words.length}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="icon-button fixed top-4 right-4 z-50 opacity-55 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] hover:opacity-100 sm:top-6 sm:right-6"
            aria-label="退出禅模式"
            title="退出禅模式"
          >
            <Minimize2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </>
      )}
    </PracticeContext.Provider>
  )
}

export default PracticePage
