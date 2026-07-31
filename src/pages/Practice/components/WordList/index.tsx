import { PracticeContext } from '../../store'
import WordCard from './WordCard'
import Tooltip from '@/components/Tooltip'
import { isReviewModeAtom } from '@/store'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { List } from 'lucide-react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

export default function WordList() {
  const { state } = useContext(PracticeContext)!

  const [isHovered, setIsHovered] = useState(false)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeCardRef = useRef<HTMLDivElement>(null)

  const words = state.chapterData.words || []
  const currentIndex = state.chapterData.index ?? 0

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
    scrollToCurrentWord(isHovered ? 'smooth' : 'auto')
  }, [isHovered, scrollToCurrentWord])

  return (
    <Popover className="relative z-30 inline-flex shrink-0 items-center">
      {({ open }) => (
        <>
          <Tooltip
            content={words.length ? `单词列表 (${currentIndex + 1}/${words.length})` : '单词列表'}
            placement="bottom"
            disabled={open}
          >
            <PopoverButton
              className={`icon-button ${open ? 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)]' : ''}`}
              aria-label="打开单词列表"
              disabled={!words.length}
            >
              <List className="h-[18px] w-[18px]" aria-hidden="true" />
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
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label={isReviewMode ? '错题单词列表' : '本章单词列表'}
            >
              <div className="mb-2 flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-1 pb-2 select-none">
                <span className="text-sm font-semibold text-[var(--ink)]">{isReviewMode ? '错题单词' : '本章单词'}</span>
                <span className="shrink-0 rounded bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                  {currentIndex + 1} / {words.length}
                </span>
              </div>

              <div ref={scrollContainerRef} className="customized-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {words.map((word, index) => {
                  const isCurrent = currentIndex === index
                  const isLearned = index < currentIndex
                  const isUnlearned = index > currentIndex

                  return (
                    <WordCard
                      key={`${word.name}_${index}`}
                      word={word}
                      index={index}
                      isActive={isCurrent}
                      isCurrent={isCurrent}
                      isLearned={isLearned}
                      isUnlearned={isUnlearned}
                      isHovered={isHovered}
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
