import { PracticeActionType, PracticeContext } from '../../store'
import ShareButton from '../ShareButton'
import ConclusionBar from './ConclusionBar'
import ResultMetric from './ResultMetric'
import WordChip from './WordChip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  currentChapterAtom,
  currentChapterInfoAtom,
  currentDictInfoAtom,
  isReviewModeAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import { hasDictionaryPresetChapters } from '@/utils'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { ArrowRight, BookOpenCheck, Clock3, EyeOff, FileSpreadsheet, Gauge, Library, RotateCcw, Target } from 'lucide-react'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const PracticeResultDialog = () => {
  const { state, dispatch } = useContext(PracticeContext)!

  const setWordDictationConfig = useSetAtom(wordDictationConfigAtom)
  const activeDictionary = useAtomValue(currentDictInfoAtom)
  const isBookMode = activeDictionary.contentType === 'book'
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const currentChapterInfo = useAtomValue(currentChapterInfoAtom)
  const hasPresetChapters = hasDictionaryPresetChapters(activeDictionary)
  const randomOrder = useAtomValue(randomConfigAtom)
  const navigate = useNavigate()

  const setReviewSession = useSetAtom(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)

  useEffect(() => {
    // tick a zero timer to calc the stats
    dispatch({ type: PracticeActionType.TICK_TIMER, addTime: 0 })
  }, [dispatch])

  const downloadPracticeReport = useCallback(() => {
    const { words, userInputLogs } = state.chapterData
    const reportRows = userInputLogs.map((log) => {
      const word = words[log.index]
      const entryName = word.name
      return {
        ...word,
        trans: word.trans.join(';'),
        correctCount: log.correctCount,
        wrongCount: log.wrongCount,
        wrongLetters: Object.entries(log.LetterMistakes)
          .map(([key, mistakes]) => `${entryName[Number(key)]}:${mistakes.length}`)
          .join(';'),
      }
    })

    import('xlsx')
      .then(({ utils, writeFileXLSX }) => {
        const worksheet = utils.json_to_sheet(reportRows)
        const workbook = utils.book_new()
        utils.book_append_sheet(workbook, worksheet, 'Data')
        const chapterName = hasPresetChapters && currentChapterInfo ? `-${currentChapterInfo.name}` : ''
        writeFileXLSX(workbook, `${activeDictionary.name}-第${currentChapter + 1}章${chapterName}.xlsx`)
      })
      .catch(() => {
        console.log('写入 xlsx 模块导入失败')
      })
  }, [activeDictionary.name, currentChapter, currentChapterInfo, hasPresetChapters, state.chapterData])

  const missedWords = useMemo(() => {
    return state.chapterData.userInputLogs
      .filter((log) => log.wrongCount > 0)
      .map((log) => state.chapterData.words[log.index])
      .filter((word) => word !== undefined)
  }, [state.chapterData.userInputLogs, state.chapterData.words])

  const isLastChapter = useMemo(() => {
    return currentChapter >= activeDictionary.chapterCount - 1
  }, [activeDictionary, currentChapter])

  const chapterAccuracy = useMemo(() => {
    const chapterLength = state.chapterData.words.length
    const cleanWordCount = chapterLength - missedWords.length
    return Math.floor((cleanWordCount / chapterLength) * 100)
  }, [missedWords.length, state.chapterData.words.length])

  const reviewSeverity = useMemo(() => {
    if (chapterAccuracy >= 85) {
      return 0
    } else if (chapterAccuracy >= 70) {
      return 1
    } else {
      return 2
    }
  }, [chapterAccuracy])

  const formattedDuration = useMemo(() => {
    const elapsedSeconds = state.timerData.time
    const minutes = Math.floor(elapsedSeconds / 60)
    const minuteText = minutes < 10 ? '0' + minutes : minutes + ''
    const remainingSeconds = elapsedSeconds % 60
    const secondText = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds + ''
    return `${minuteText}:${secondText}`
  }, [state.timerData.time])

  const chapterTitle = hasPresetChapters
    ? `第 ${currentChapter + 1} 章 · ${currentChapterInfo?.name ?? ''}`.trim()
    : `第 ${currentChapter + 1} 章`

  const restartPractice = useCallback(async () => {
    if (isReviewMode) {
      return
    }

    setWordDictationConfig((currentConfig) => {
      if (currentConfig.isOpen) {
        if (currentConfig.openBy === 'auto') {
          return { ...currentConfig, isOpen: false }
        }
      }
      return currentConfig
    })
    dispatch({ type: PracticeActionType.REPEAT_CHAPTER, shouldShuffle: !isBookMode && randomOrder.isOpen })
  }, [isBookMode, isReviewMode, setWordDictationConfig, dispatch, randomOrder.isOpen])

  const startDictation = useCallback(async () => {
    if (isReviewMode) {
      return
    }

    setWordDictationConfig((currentConfig) => ({ ...currentConfig, isOpen: true, openBy: 'auto' }))
    dispatch({ type: PracticeActionType.REPEAT_CHAPTER, shouldShuffle: randomOrder.isOpen })
  }, [isReviewMode, setWordDictationConfig, dispatch, randomOrder.isOpen])

  const continueToNextChapter = useCallback(() => {
    if (isReviewMode) {
      return
    }

    setWordDictationConfig((currentConfig) => {
      if (currentConfig.isOpen) {
        if (currentConfig.openBy === 'auto') {
          return { ...currentConfig, isOpen: false }
        }
      }
      return currentConfig
    })
    if (!isLastChapter) {
      setCurrentChapter((chapterIndex) => chapterIndex + 1)
      dispatch({ type: PracticeActionType.NEXT_CHAPTER })
    }
  }, [dispatch, isLastChapter, isReviewMode, setCurrentChapter, setWordDictationConfig])

  const closeResults = useCallback(() => {
    if (isReviewMode) {
      setCurrentChapter(0)
      setReviewSession((session) => ({ ...session, isReviewMode: false }))
    } else {
      dispatch({ type: PracticeActionType.REPEAT_CHAPTER, shouldShuffle: false })
    }
  }, [dispatch, isReviewMode, setCurrentChapter, setReviewSession])

  const returnToLibrary = useCallback(() => {
    setCurrentChapter(0)
    setReviewSession((session) => ({ ...session, isReviewMode: false }))
    navigate('/library')
  }, [navigate, setCurrentChapter, setReviewSession])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) closeResults()
      }}
    >
      <DialogContent className="result-dialog flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-[840px] flex-col gap-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-0 sm:max-h-[calc(100vh-3rem)]">
        <DialogHeader className="result-header shrink-0 border-b border-[var(--line)] bg-[var(--surface)] px-6 py-5 pr-14 text-left sm:px-8 sm:py-6">
          <p className="mb-1 text-xs font-semibold text-[var(--primary)]">练习完成</p>
          <DialogTitle className="font-display truncate text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
            {`${activeDictionary.name} ${isReviewMode ? '错题复习' : chapterTitle}`}
          </DialogTitle>
        </DialogHeader>

        <div className="customized-scrollbar flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
          <dl className="grid grid-cols-1 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <ResultMetric icon={Target} value={`${state.timerData.accuracy}%`} label="正确率" />
            <ResultMetric icon={Clock3} value={formattedDuration} label="章节耗时" />
            <ResultMetric icon={Gauge} value={String(state.timerData.wpm)} label="WPM" />
          </dl>

          <section className="mt-7" aria-labelledby="mistake-title">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 id="mistake-title" className="text-base font-semibold text-[var(--ink)]">
                  需要回看的单词
                </h3>
                <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                  {missedWords.length} 个
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!isReviewMode && !isBookMode && (
                  <>
                    <ShareButton />
                    <button
                      type="button"
                      className="icon-button"
                      onClick={downloadPracticeReport}
                      aria-label="导出练习记录"
                      title="导出练习记录"
                    >
                      <FileSpreadsheet className="h-[18px] w-[18px]" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-soft)]">
              <div className="customized-scrollbar flex max-h-56 min-h-36 flex-wrap content-start gap-2 overflow-y-auto p-4 sm:p-5">
                {missedWords.length > 0 ? (
                  missedWords.map((word, index) => <WordChip key={`${index}-${word.name}`} word={word} />)
                ) : (
                  <div className="flex w-full flex-col items-center justify-center py-6 text-center">
                    <BookOpenCheck className="h-6 w-6 text-[var(--success)]" />
                    <p className="mt-2 text-sm font-medium text-[var(--ink)]">本章没有错词，表现出色！</p>
                  </div>
                )}
              </div>
              <ConclusionBar mistakeLevel={reviewSeverity} mistakeCount={missedWords.length} />
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--line)] bg-[var(--surface)] px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          {!isReviewMode && (
            <>
              {!isBookMode && (
                <button className="secondary-button w-full sm:w-auto" type="button" onClick={startDictation} title="默写本章节">
                  <EyeOff className="h-4 w-4" />
                  默写本章
                </button>
              )}
              <button className="secondary-button w-full sm:w-auto" type="button" onClick={restartPractice} title="重复本章节">
                <RotateCcw className="h-4 w-4" />
                再练一次
              </button>
            </>
          )}
          {!isLastChapter && !isReviewMode && (
            <button className="primary-button w-full sm:w-auto" type="button" onClick={continueToNextChapter} title="下一章节">
              <ArrowRight className="h-4 w-4" />
              下一章节
            </button>
          )}

          {isReviewMode && (
            <button className="primary-button w-full sm:w-auto" type="button" onClick={returnToLibrary} title="练习其他章节">
              <Library className="h-4 w-4" />
              练习其他章节
            </button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  )
}

export default PracticeResultDialog
