import DictDetail from './DictDetail'
import { useDictStats } from './hooks/useDictStats'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import { chapterLengthAtom, currentDictIdAtom } from '@/store'
import type { Dictionary } from '@/typings'
import { getDictionaryChapterCount } from '@/utils'
import { useAtomValue } from 'jotai'
import { ArrowUpRight, Check } from 'lucide-react'
import { useMemo, useRef } from 'react'

export default function DictionaryEntry({ dictionary, ordinal }: { dictionary: Dictionary; ordinal: number }) {
  const activeDictionaryId = useAtomValue(currentDictIdAtom)
  const chapterLength = useAtomValue(chapterLengthAtom)
  const entryRef = useRef<HTMLButtonElement>(null)
  const intersection = useIntersectionObserver(entryRef, {})
  const stats = useDictStats(dictionary.id, Boolean(intersection?.isIntersecting))
  const chapterCount = useMemo(() => getDictionaryChapterCount(dictionary, chapterLength), [chapterLength, dictionary])
  const isActive = activeDictionaryId === dictionary.id
  const progress = stats ? Math.ceil((stats.exercisedChapterCount / chapterCount) * 100) : 0
  const progressLabel = stats ? `${stats.exercisedChapterCount}/${chapterCount} 章` : '读取中'
  const contentTypes = dictionary.tags?.length > 0 ? dictionary.tags.slice(0, 3).join(' · ') : dictionary.language.toUpperCase()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          ref={entryRef}
          type="button"
          className={`group grid min-h-28 w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b px-2 py-5 text-left transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none md:grid-cols-[4rem_minmax(0,1.4fr)_minmax(9rem,0.7fr)_12rem] md:gap-5 md:px-3 ${
            isActive ? 'border-transparent bg-[var(--primary-soft)]' : 'border-[var(--line)] hover:bg-[var(--surface-soft)]'
          }`}
          aria-label={`查看${dictionary.name}，${dictionary.length}词${stats ? `，完成${progress}%` : ''}`}
        >
          <span
            className={`font-display text-center text-2xl leading-none font-medium tabular-nums transition-colors md:text-left ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] group-hover:text-[var(--ink)]'
            }`}
            aria-hidden="true"
          >
            {String(ordinal).padStart(2, '0')}
          </span>

          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-[var(--ink)] sm:text-base">{dictionary.name}</span>
              {isActive && (
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[var(--primary)]">
                  <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                  当前
                </span>
              )}
            </span>
            <span className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{dictionary.description || '暂无词典说明'}</span>
          </span>

          <span className="col-start-2 min-w-0 text-[10px] leading-4 font-medium text-[var(--muted)] md:col-start-auto md:text-xs">
            <span className="line-clamp-2">{contentTypes}</span>
            <span className="mt-1 block text-[var(--body)] tabular-nums">{dictionary.length.toLocaleString('zh-CN')} 词</span>
          </span>

          <span className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3 text-[10px] font-medium">
                <span className={isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}>{isActive ? '当前词典' : '已练章节'}</span>
                <span className="text-[var(--body)] tabular-nums">{progressLabel}</span>
              </span>
              <span className="mt-2 block h-px overflow-hidden bg-[var(--line-strong)]" aria-hidden="true">
                <span className="block h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
              </span>
            </span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--ink)]"
              aria-hidden="true"
            />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(64rem,calc(100vw-1rem))] max-w-none overflow-hidden rounded-lg border-[var(--line)] bg-[var(--surface)] p-0 [&>button]:text-[var(--on-dark-muted)] [&>button]:hover:bg-[var(--surface-dark-soft)] [&>button]:hover:text-[var(--on-dark)]">
        <DictDetail dictionary={dictionary} />
      </DialogContent>
    </Dialog>
  )
}
