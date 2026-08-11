import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Word } from '@/typings'
import { getWordExample, getWordPhonetic } from '@/utils/wordExample'
import type { WordExample, WordPhonetic } from '@/utils/wordExample'
import { BookOpenText, Quote } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function normalizePhonetic(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

export function BookWordDialog({ word, onClose }: { word: Word | null; onClose: () => void }) {
  const lookup = useMemo(() => word?.lookup || word?.name.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '') || '', [word])
  const [example, setExample] = useState<WordExample | null>(null)
  const [phonetic, setPhonetic] = useState<WordPhonetic | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

  const pronunciationWord: Word = {
    name: lookup,
    trans: [],
    usphone: phonetic?.usphone ?? '',
    ukphone: phonetic?.ukphone ?? '',
  }

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
            <div className="flex items-center gap-3 pb-0.5">
              <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--body)]">US</span>
                {phonetic?.usphone ? `/${normalizePhonetic(phonetic.usphone)}/` : '音标读取中'}
                <WordPronunciationIcon
                  word={pronunciationWord}
                  lang="en"
                  pronunciationType="us"
                  className="h-4 w-4"
                  ariaLabel={`播放 ${lookup} 美音`}
                />
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--body)]">UK</span>
                {phonetic?.ukphone ? `/${normalizePhonetic(phonetic.ukphone)}/` : '音标读取中'}
                <WordPronunciationIcon
                  word={pronunciationWord}
                  lang="en"
                  pronunciationType="uk"
                  className="h-4 w-4"
                  ariaLabel={`播放 ${lookup} 英音`}
                />
              </span>
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
