import Tooltip from '@/components/Tooltip'
import {
  chapterLengthAtom,
  currentChapterAtom,
  currentDictInfoAtom,
  dictationProgressAtom,
  isReviewModeAtom,
  learnProgressAtom,
  wordDictationConfigAtom,
} from '@/store'
import { getDictionaryChapter, hasDictionaryPresetChapters } from '@/utils'
import range from '@/utils/range'
import { Listbox, Transition } from '@headlessui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Check, Search } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

export const DictChapterButton = () => {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const chapterLength = useAtomValue(chapterLengthAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const chapterCount = currentDictInfo.chapterCount
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const isDictationMode = useAtomValue(wordDictationConfigAtom).isOpen
  const learnProgress = useAtomValue(learnProgressAtom)
  const dictationProgress = useAtomValue(dictationProgressAtom)
  const activeProgress = (isDictationMode ? dictationProgress : learnProgress)[currentDictInfo.id]
  const currentSavedChapter = activeProgress?.chapter ?? 0
  const currentSavedIndex = activeProgress?.index ?? 0
  const [searchQuery, setSearchQuery] = useState('')
  const hasPresetChapters = hasDictionaryPresetChapters(currentDictInfo)
  const currentChapterInfo = getDictionaryChapter(currentDictInfo, currentChapter, chapterLength)
  const currentChapterLabel = hasPresetChapters
    ? `第 ${currentChapter + 1} 章 · ${currentChapterInfo?.name ?? ''}`.trim()
    : `第 ${currentChapter + 1} 章`

  const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === ' ') {
      event.preventDefault()
    }
  }

  // 按需窗口切片渲染，防止章节过多时 DOM 节点过大造成卡顿
  const visibleChapterIndices = useMemo(() => {
    const query = searchQuery.trim()
    if (!query) {
      if (chapterCount <= 60) return range(0, chapterCount, 1)
      const start = Math.max(0, Math.min(currentChapter - 20, chapterCount - 60))
      const end = Math.min(chapterCount, start + 60)
      return range(start, end, 1)
    }

    const matches: number[] = []
    const q = query.toLowerCase()
    for (let i = 0; i < chapterCount; i++) {
      const chapter = getDictionaryChapter(currentDictInfo, i, chapterLength)
      if (String(i + 1).includes(q) || `第${i + 1}章`.includes(q) || chapter?.name.toLowerCase().includes(q)) {
        matches.push(i)
        if (matches.length >= 60) break
      }
    }
    return matches
  }, [chapterCount, chapterLength, currentChapter, currentDictInfo, searchQuery])

  return (
    <>
      <Tooltip content="词典切换" placement="bottom">
        <NavLink
          className="flex min-h-9 max-w-[164px] items-center truncate rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline-none sm:max-w-[280px] lg:max-w-none"
          to="/library"
        >
          {currentDictInfo.name} {isReviewMode && '错题复习'}
        </NavLink>
      </Tooltip>
      {!isReviewMode && (
        <Tooltip content="章节切换" placement="bottom">
          <Listbox as="div" value={currentChapter} onChange={setCurrentChapter} className="relative shrink-0">
            <Listbox.Button
              onKeyDown={handleKeyDown}
              className="inline-flex min-h-9 max-w-48 min-w-0 shrink-0 items-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline-none sm:max-w-72 md:max-w-none"
            >
              <span className="truncate whitespace-nowrap">{currentChapterLabel}</span>
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="listbox-options w-auto min-w-[16rem] max-w-md p-1">
                {chapterCount > 30 && (
                  <div
                    className="sticky top-0 z-10 mb-1 border-b border-[var(--line)] bg-[var(--surface-raised)] pb-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative flex items-center px-1">
                      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--muted)]" />
                      <input
                        type="text"
                        placeholder="搜索/跳转章号..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-soft)] py-1 pr-2 pl-7 text-xs text-[var(--ink)] outline-none focus:border-[var(--line-strong)]"
                      />
                    </div>
                  </div>
                )}
                {visibleChapterIndices.length > 0 ? (
                  visibleChapterIndices.map((index) => {
                    const chapter = getDictionaryChapter(currentDictInfo, index, chapterLength)
                    if (!chapter) return null
                    const chapterWordCount = chapter.wordCount
                    let savedWordIndex = 0
                    if (index < currentSavedChapter) {
                      savedWordIndex = chapterWordCount
                    } else if (index === currentSavedChapter) {
                      savedWordIndex = currentSavedIndex
                    } else {
                      savedWordIndex = 0
                    }
                    return (
                      <Listbox.Option key={index} value={index}>
                        {({ selected }) => (
                          <div className="group flex min-w-0 cursor-pointer items-center justify-between whitespace-nowrap">
                            {selected ? (
                              <span className="listbox-options-icon">
                                <Check className="h-4 w-4" aria-hidden="true" />
                              </span>
                            ) : null}
                            <span className="min-w-0 flex-1 truncate whitespace-nowrap tabular-nums">
                              {hasPresetChapters ? `第 ${index + 1} 章 · ${chapter.name}` : `第 ${index + 1} 章`} ({savedWordIndex}/
                              {chapterWordCount})
                            </span>
                          </div>
                        )}
                      </Listbox.Option>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-center text-xs text-[var(--muted)]">未找到匹配章节</div>
                )}
              </Listbox.Options>
            </Transition>
          </Listbox>
        </Tooltip>
      )}
    </>
  )
}
