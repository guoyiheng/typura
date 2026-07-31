import Layout from '../../components/Layout'
import { DictChapterButton } from './components/DictChapterButton'
import ResultScreen from './components/ResultScreen'
import SessionMetrics from './components/SessionMetrics'
import SettingsMenu from './components/SettingsMenu'
import WordDictationSwitcher from './components/WordDictationSwitcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { WordStatusPanel } from './components/WordStatusPanel'
import { useConfetti } from './hooks/useConfetti'
import { usePersistPracticeProgress, useRestorePracticeProgress } from './hooks/usePracticeProgress'
import { useWordList } from './hooks/useWordList'
import { PracticeActionType, PracticeContext, initialPracticeState, practiceReducer } from './store'
import type { PracticeAction } from './store'
import Header from '@/components/Header'
import { LoadingUI } from '@/components/Loading'
import Tooltip from '@/components/Tooltip'
import { idDictionaryMap } from '@/resources/dictionary'
import {
  currentChapterAtom,
  currentChapterInfoAtom,
  currentDictIdAtom,
  hotkeysConfigAtom,
  isReviewModeAtom,
  isZenModeAtom,
  randomConfigAtom,
} from '@/store'
import {
  createDailyPracticeStats,
  dailyPracticeStatsAtom,
  getMillisecondsUntilNextPracticeDay,
  normalizeDailyPracticeStats,
} from '@/store/dailyPracticeStats'
import { CTRL, IsDesktop, isLegal } from '@/utils'
import { useSaveChapterRecord } from '@/utils/db'
import { useHotkeyAction } from '@/utils/hotkeyBus'
import { eventMatchesShortcut, isHotkeyRecorderEvent } from '@/utils/hotkeys'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Languages, Minimize2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useImmerReducer } from 'use-immer'

const PracticePage: React.FC = () => {
  const [state, practiceDispatch] = useImmerReducer(practiceReducer, structuredClone(initialPracticeState))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { words } = useWordList()

  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const currentChapterInfo = useAtomValue(currentChapterInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const [isZenMode, setIsZenMode] = useAtom(isZenModeAtom)
  const hotkeysConfig = useAtomValue(hotkeysConfigAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const setDailyPracticeStats = useSetAtom(dailyPracticeStatsAtom)
  const saveChapterRecord = useSaveChapterRecord()

  const dispatch = useCallback(
    (action: PracticeAction) => {
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
    [practiceDispatch, setDailyPracticeStats],
  )

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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isHotkeyRecorderEvent(e)) return

      if (eventMatchesShortcut(e, hotkeysConfig.toggleZenMode)) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        setIsZenMode((prev) => !prev)
        return
      }

      if ((e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) && isZenMode) {
        e.preventDefault()
        e.stopPropagation()
        setIsZenMode(false)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [hotkeysConfig.toggleZenMode, isZenMode, setIsZenMode])

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

  useRestorePracticeProgress({ words, dispatch, shouldShuffle: randomConfig.isOpen })
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
      <Layout>
        {/* 导航 */}
        {!isZenMode && (
          <Header>
            <DictChapterButton />
            <WordList />
            <WordDictationSwitcher />

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

            <SettingsMenu />
          </Header>
        )}
        <div className="practice-layout flex h-full w-full flex-1 items-center justify-center">
          <div className={`practice-workspace ${isZenMode ? 'practice-workspace--zen' : ''}`}>
            <div className="practice-column relative flex h-full w-full max-w-[900px] min-w-0 flex-col items-center justify-self-center">
              <section className="practice-stage w-full" aria-label="当前练习">
                <div className="practice-stage__body">{isLoading ? <LoadingUI /> : !state.isFinished && <WordPanel />}</div>
              </section>
              {!isZenMode && !state.isFinished && <WordStatusPanel word={state.chapterData.words[state.chapterData.index]} />}
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
              className="zen-progress"
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
