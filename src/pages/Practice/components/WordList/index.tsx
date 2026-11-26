import { PracticeContext } from '../../store'
import WordCard from './WordCard'
import Tooltip from '@/components/Tooltip'
import { isReviewModeAtom } from '@/store'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

const PROGRESS_RING_RADIUS = 8
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS

export default function WordList() {
  const { state } = useContext(PracticeContext)!

  const [isPanelHovered, setIsPanelHovered] = useState(false)
  const [intersectionRoot, setIntersectionRoot] = useState<HTMLDivElement | null>(null)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeCardRef = useRef<HTMLDivElement>(null)

  const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node
    setIntersectionRoot(node)
  }, [])

  const words = state.chapterData.words || []
  const currentIndex = state.chapterData.index ?? 0
  const totalWords = words.length
  const completedWords = totalWords === 0 ? 0 : Math.min(currentIndex + 1, totalWords)
  const progressRatio = totalWords === 0 ? 0 : completedWords / totalWords
  const progressLabel = totalWords === 0 ? '0 / 0' : `${completedWords} / ${totalWords}`

  const scrollToCurrentWord = useCallback(
    (behavior: ScrollBehavior) => {
      if (!scrollContainerRef.current) return

      const itemHeight = 54
      const targetScrollTop = Math.max(0, (currentIndex - 2) * itemHeight)
      scrollContainerRef.current.scrollTo({ top: targetScrollTop, behavior })
    },
    [currentIndex],
  )

  // 当前词变化时，保持它位于列表中部附近。
  useEffect(() => {
    scrollToCurrentWord(isPanelHovered ? 'smooth' : 'auto')
  }, [isPanelHovered, scrollToCurrentWord])

  return (
    <Popover className="relative z-30 inline-flex shrink-0 items-center">
      {({ open }) => (
        <>
          <Tooltip content={totalWords ? `单词列表 (${completedWords}/${totalWords})` : '单词列表'} placement="bottom" disabled={open}>
            <PopoverButton
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-[var(--muted)] transition-colors hover:border-[var(--line)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] ${
                open ? 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)]' : ''
              }`}
              aria-label={`打开单词列表，当前进度 ${progressLabel}`}
              disabled={!totalWords}
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 -rotate-90" aria-hidden="true">
                <circle cx="10" cy="10" r={PROGRESS_RING_RADIUS} fill="none" stroke="var(--line)" strokeWidth="2" />
                <circle
                  cx="10"
                  cy="10"
                  r={PROGRESS_RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
                  strokeDashoffset={PROGRESS_RING_CIRCUMFERENCE * (1 - progressRatio)}
                  className="transition-[stroke-dashoffset] duration-300 ease-out"
                />
              </svg>
              <span className="font-mono text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                {totalWords === 0 ? '–' : `${completedWords}/${totalWords}`}
              </span>
            </PopoverButton>
          </Tooltip>

          <Transition
            beforeEnter={() => requestAnimationFrame(() => scrollToCurrentWord('auto'))}
            enter="transition duration-150 ease-out"
            enterFrom="translate-y-1 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transition duration-100 ease-in"
            leaveFrom="translate-y-0 opacity-100"
            leaveTo="translate-y-1 opacity-0"
          >
            <PopoverPanel
              anchor={{ to: 'bottom end', gap: 8, padding: 16 }}
              className="surface z-[210] flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col p-2.5"
              onMouseEnter={() => setIsPanelHovered(true)}
              onMouseLeave={() => setIsPanelHovered(false)}
              aria-label={isReviewMode ? '错题单词列表' : '本章单词列表'}
            >
              <div className="mb-2 flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-1 pb-2 select-none">
                <span className="text-sm font-semibold text-[var(--ink)]">{isReviewMode ? '错题单词' : '本章单词'}</span>
                <span className="shrink-0 rounded bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                  {currentIndex + 1} / {words.length}
                </span>
              </div>

              <div ref={setScrollContainerRef} className="customized-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {words.map((word, index) => {
                  const isCurrent = currentIndex === index

                  return (
                    <WordCard
                      key={`${word.name}_${index}`}
                      word={word}
                      index={index}
                      isActive={isCurrent}
                      intersectionRoot={intersectionRoot}
                      ref={isCurrent ? activeCardRef : undefined}
                    />
                  )
                })}
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
