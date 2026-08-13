import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import Tooltip from '@/components/Tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { pronunciationConfigAtom } from '@/store'
import type { Word } from '@/typings'
import { getWordExample, getWordPhonetic } from '@/utils/wordExample'
import type { WordExample, WordPhonetic } from '@/utils/wordExample'
import { useAtomValue } from 'jotai'
import { ArrowLeftRight, BookOpenText, Quote } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function normalizePhonetic(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

export function BookWordDialog({ word, onClose }: { word: Word | null; onClose: () => void }) {
  const lookup = useMemo(() => word?.lookup || word?.name.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '') || '', [word])
  const [example, setExample] = useState<WordExample | null>(null)
  const [phonetic, setPhonetic] = useState<WordPhonetic | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const preferredPronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'
  const [displayedPronunciationType, setDisplayedPronunciationType] = useState<'us' | 'uk'>(preferredPronunciationType)

  useEffect(() => {
    if (!lookup) return

    const controller = new AbortController()
    setIsLoading(true)
    setExample(null)
    setPhonetic(null)

    void Promise.all([getWordExample(lookup, controller.signal), getWordPhonetic(lookup, controller.signal)])
      .then(([nextExample, nextPhonetic]) => {
        setExample(nextExample)
        setPhonetic(nextPhonetic)
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [lookup])

  useEffect(() => {
    setDisplayedPronunciationType(preferredPronunciationType)
  }, [lookup, preferredPronunciationType])

  const pronunciationWord: Word = {
    name: lookup,
    trans: [],
    usphone: phonetic?.usphone ?? '',
    ukphone: phonetic?.ukphone ?? '',
  }
  const displayedPhonetic = displayedPronunciationType === 'us' ? phonetic?.usphone : phonetic?.ukphone
  const displayedAccentLabel = displayedPronunciationType === 'us' ? 'US' : 'UK'
  const alternateAccentName = displayedPronunciationType === 'us' ? '英音' : '美音'

  return (
    <Dialog open={Boolean(word)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[520px] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--line)] px-6 py-5 pr-14 text-left sm:px-7">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--primary)]">
            <BookOpenText className="h-3.5 w-3.5" />
            WORD IN CONTEXT
          </p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <DialogTitle className="font-display text-4xl leading-none font-semibold">{lookup}</DialogTitle>
            <div className="flex items-center gap-1.5 pb-0.5 text-xs text-[var(--muted)]">
              <Tooltip content={`临时查看${alternateAccentName}音标`}>
                <button
                  type="button"
                  onClick={() => setDisplayedPronunciationType((current) => (current === 'us' ? 'uk' : 'us'))}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center transition-colors hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] focus-visible:outline-none"
                  aria-label={`临时查看${alternateAccentName}音标`}
                >
                  <ArrowLeftRight className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </Tooltip>
              <span className="font-semibold text-[var(--body)]">{displayedAccentLabel}</span>
              <span>{displayedPhonetic ? `/${normalizePhonetic(displayedPhonetic)}/` : '音标读取中'}</span>
              <WordPronunciationIcon
                key={displayedPronunciationType}
                word={pronunciationWord}
                lang="en"
                pronunciationType={displayedPronunciationType}
                className="h-4 w-4"
                ariaLabel={`播放 ${lookup} ${displayedPronunciationType === 'us' ? '美音' : '英音'}`}
              />
            </div>
          </div>
          <DialogDescription className="sr-only">查看单词音标、发音和例句</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 sm:px-7">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <Quote className="h-3.5 w-3.5 text-[var(--primary)]" />
            例句
          </div>
          {isLoading ? (
            <div className="mt-4 space-y-3" aria-label="正在读取例句">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-soft)]" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--surface-soft)]" />
            </div>
          ) : example ? (
            <blockquote className="mt-4 border-l-2 border-[var(--primary)] pl-4">
              <p className="text-base leading-7 font-medium text-[var(--ink)]">{example.english}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{example.chinese}</p>
            </blockquote>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">暂时没有可用例句。</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
