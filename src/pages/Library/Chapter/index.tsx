import { useChapterStats } from '../hooks/useChapterStats'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import { idDictionaryMap } from '@/resources/dictionary'
import { chapterLengthAtom, dictationProgressAtom, learnProgressAtom, wordDictationConfigAtom } from '@/store'
import { getDictionaryChapter, hasDictionaryPresetChapters } from '@/utils'
import { useAtomValue } from 'jotai'
import { Check, CircleDot } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function Chapter({
  index,
  checked,
  dictID,
  onChange,
}: {
  index: number
  checked: boolean
  dictID: string
  onChange: (index: number) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)

  const entry = useIntersectionObserver(ref, {})
  const isVisible = !!entry?.isIntersecting
  const chapterStatus = useChapterStats(index, dictID, isVisible)

  const isDictationMode = useAtomValue(wordDictationConfigAtom).isOpen
  const chapterLength = useAtomValue(chapterLengthAtom)
  const learnProgress = useAtomValue(learnProgressAtom)
  const dictationProgress = useAtomValue(dictationProgressAtom)
  const activeProgress = (isDictationMode ? dictationProgress : learnProgress)[dictID]
  const currentSavedChapter = activeProgress?.chapter ?? 0
  const currentSavedIndex = activeProgress?.index ?? 0

  const dict = idDictionaryMap[dictID]
  const chapter = dict ? getDictionaryChapter(dict, index, chapterLength) : undefined
  const hasPresetChapters = dict ? hasDictionaryPresetChapters(dict) : false
  const chapterWordCount = chapter?.wordCount ?? 0
  const chapterTitle = chapter && hasPresetChapters ? chapter.name : `第 ${index + 1} 章`
  let savedWordIndex = 0
  if (index < currentSavedChapter) {
    savedWordIndex = chapterWordCount
  } else if (index === currentSavedChapter) {
    savedWordIndex = currentSavedIndex
  } else {
    savedWordIndex = 0
  }

  const isComplete = savedWordIndex >= chapterWordCount
  const isInProgress = savedWordIndex > 0 && !isComplete
  const statusLabel = isComplete ? '已完成' : isInProgress ? '进行中' : '未开始'
  const exerciseLabel = chapterStatus
    ? chapterStatus.exerciseCount > 0
      ? `练习 ${chapterStatus.exerciseCount} 次`
      : '暂无记录'
    : '正在读取'

  useEffect(() => {
    if (checked && ref.current !== null) {
      const button = ref.current
      const container = button.parentElement?.parentElement?.parentElement
      container?.scroll({
        top: button.offsetTop - container.offsetTop - 300,
        behavior: 'smooth',
      })
    }
  }, [checked])

  return (
    <button
      type="button"
      ref={ref}
      className={`group relative grid min-h-[5.25rem] w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 border-b px-2 py-3 text-left transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none ${
        checked
          ? 'rounded-md border-transparent bg-[var(--primary-soft)]'
          : 'border-[var(--line)] bg-transparent hover:bg-[var(--surface-soft)]'
      }`}
      onClick={() => onChange(index)}
      aria-pressed={checked}
      aria-label={`第 ${index + 1} 章${hasPresetChapters ? `，${chapterTitle}` : ''}，${statusLabel}，${savedWordIndex}/${chapterWordCount} 词`}
    >
      <span
        className={`font-display text-center text-2xl leading-none font-medium tabular-nums transition-colors ${
          checked ? 'text-[var(--primary)]' : isComplete ? 'text-[var(--success)]' : 'text-[var(--muted)]'
        }`}
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-[var(--ink)]">{chapterTitle}</span>
          <span
            className={`flex shrink-0 items-center gap-1 text-[10px] font-medium ${
              checked
                ? 'text-[var(--primary)]'
                : isComplete
                  ? 'text-[var(--success)]'
                  : isInProgress
                    ? 'text-[var(--warning)]'
                    : 'text-[var(--muted)]'
            }`}
          >
            {isComplete ? (
              <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            ) : isInProgress ? (
              <CircleDot className="h-3 w-3" aria-hidden="true" />
            ) : null}
            {checked ? '当前' : statusLabel}
          </span>
        </span>
        <span className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
          <span className="truncate">{exerciseLabel}</span>
          <span className="shrink-0 font-medium text-[var(--body)] tabular-nums">
            {savedWordIndex}/{chapterWordCount} 词
          </span>
        </span>
      </span>
    </button>
  )
}
