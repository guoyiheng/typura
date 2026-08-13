import Tooltip from '@/components/Tooltip'
import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { pronunciationConfigAtom } from '@/store'
import type { Word } from '@/typings'
import { getWordDetails, getWordMnemonic } from '@/utils/wordExample'
import type { WordDetails } from '@/utils/wordExample'
import { useAtomValue } from 'jotai'
import { ArrowLeftRight, BookOpenText, Image as ImageIcon, Network, Quote, Sprout } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function normalizePhonetic(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

export function WordDetailsDialog({ word, onClose }: { word: string | null; onClose: () => void }) {
  const normalizedWord = word?.trim() ?? ''
  const [details, setDetails] = useState<WordDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const preferredPronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'
  const [displayedPronunciationType, setDisplayedPronunciationType] = useState<'us' | 'uk'>(preferredPronunciationType)
  const [dialogWord, setDialogWord] = useState(normalizedWord)

  useEffect(() => {
    setDialogWord(normalizedWord)
  }, [normalizedWord])

  useEffect(() => {
    if (!dialogWord) return

    const controller = new AbortController()
    setIsLoading(true)
    setDetails(null)
    setImageFailed(false)
    setDisplayedPronunciationType(preferredPronunciationType)

    void Promise.all([getWordDetails(dialogWord, controller.signal), getWordMnemonic(dialogWord, controller.signal)])
      .then(([nextDetails, mnemonic]) => setDetails({ ...nextDetails, mnemonic }))
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [dialogWord, preferredPronunciationType])

  const pronunciationWord = useMemo<Word>(
    () => ({
      name: dialogWord,
      trans: [],
      usphone: details?.phonetic?.usphone ?? '',
      ukphone: details?.phonetic?.ukphone ?? '',
    }),
    [details?.phonetic?.ukphone, details?.phonetic?.usphone, dialogWord],
  )
  const displayedPhonetic = displayedPronunciationType === 'us' ? details?.phonetic?.usphone : details?.phonetic?.ukphone
  const displayedAccentLabel = displayedPronunciationType === 'us' ? 'US' : 'UK'
  const alternateAccentName = displayedPronunciationType === 'us' ? '英音' : '美音'
  const meaning = details?.mnemonic.meaning
  const imageUrl = imageFailed ? null : details?.mnemonic.imageUrl

  return (
    <Dialog open={Boolean(normalizedWord)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="customized-scrollbar max-h-[min(720px,calc(100vh-2rem))] w-[calc(100%-2rem)] max-w-[620px] gap-0 overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--surface)] px-6 py-5 pr-14 text-left sm:px-7">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--primary)]">
            <BookOpenText className="h-3.5 w-3.5" />
            WORD DETAILS
          </p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <DialogTitle className="font-display text-4xl leading-none font-semibold">{dialogWord}</DialogTitle>
            <div className="flex items-center gap-1.5 pb-0.5 text-xs text-[var(--muted)]">
                <button
                  type="button"
                  onClick={() => setDisplayedPronunciationType((current) => (current === 'us' ? 'uk' : 'us'))}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center transition-colors hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none"
                  aria-label={`临时查看${alternateAccentName}音标`}
                >
                  <ArrowLeftRight className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
                </button>
              <span className="font-semibold text-[var(--body)]">{displayedAccentLabel}</span>
              <span>{displayedPhonetic ? `/${normalizePhonetic(displayedPhonetic)}/` : isLoading ? '音标读取中' : '暂无音标'}</span>
              <WordPronunciationIcon
                key={`${dialogWord}-${displayedPronunciationType}`}
                word={pronunciationWord}
                lang="en"
                pronunciationType={displayedPronunciationType}
                className="h-4 w-4"
                ariaLabel={`播放 ${dialogWord} ${displayedPronunciationType === 'us' ? '美音' : '英音'}`}
              />
            </div>
          </div>
          <DialogDescription className="sr-only">查看 {dialogWord} 的完整单词内容</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-[var(--line)] px-6 sm:px-7">
          {isLoading ? (
            <div className="space-y-3 py-6" aria-label="正在读取单词内容">
              <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-soft)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-soft)]" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--surface-soft)]" />
            </div>
          ) : (
            <>
              {(meaning || details?.mnemonic.fullMeanings.length) && (
                <section className="py-5">
                  {details?.mnemonic.fullMeanings.length ? (
                    <div className="space-y-2">
                      {details.mnemonic.fullMeanings.map((item) => (
                        <p
                          key={item}
                          className="text-sm leading-6 text-[var(--body)] first:text-base first:font-semibold first:text-[var(--ink)]"
                        >
                          {item}
                        </p>
                      ))}
                    </div>
                  ) : meaning ? (
                    <>
                      <p className="text-lg font-semibold text-[var(--ink)]">{meaning.primary}</p>
                      {meaning.secondary.length > 0 && (
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{meaning.secondary.join(' · ')}</p>
                      )}
                    </>
                  ) : null}
                </section>
              )}

              {details?.example && (
                <section className="py-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                    <Quote className="h-3.5 w-3.5 text-[var(--primary)]" />
                    例句
                  </div>
                  <blockquote className="mt-3 border-l-2 border-[var(--primary)] pl-4">
                    <p className="text-base leading-7 font-medium text-[var(--ink)]">{details.example.english}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{details.example.chinese}</p>
                  </blockquote>
                </section>
              )}

              {details?.mnemonic.rootAnalysis && (
                <section className="py-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                    <Sprout className="h-3.5 w-3.5 text-[var(--primary)]" />
                    词根 / 来源
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--body)]">{details.mnemonic.rootAnalysis}</p>
                </section>
              )}

              {imageUrl && (
                <section className="py-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                    <ImageIcon className="h-3.5 w-3.5 text-[var(--primary)]" />
                    核心画面
                  </div>
                  <img
                    src={imageUrl}
                    alt={`与 ${dialogWord} 常用义相关的核心画面`}
                    className="mt-3 max-h-64 w-full rounded object-contain object-left"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                  />
                  {details?.mnemonic.imageSource && (
                    <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                      来源：
                      {details.mnemonic.imageSourceUrl ? (
                        <a
                          href={details.mnemonic.imageSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[var(--ink)] hover:underline"
                        >
                          {details.mnemonic.imageSource}
                        </a>
                      ) : (
                        details.mnemonic.imageSource
                      )}
                    </p>
                  )}
                </section>
              )}

              {details?.mnemonic.similarWords.length ? (
                <section className="py-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                    <Network className="h-3.5 w-3.5 text-[var(--primary)]" />
                    易混单词
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {details.mnemonic.similarWords.map((item) => (
                      <button
                        key={item.word}
                        type="button"
                        onClick={() => setDialogWord(item.word)}
                        className="group text-left text-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none"
                      >
                        <span className="font-semibold text-[var(--ink)] transition-colors group-hover:text-[var(--primary)]">
                          {item.word}
                        </span>
                        <span className="ml-1.5 text-[var(--muted)]">{item.meaning}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {!meaning && !details?.example && !details?.mnemonic.rootAnalysis && !imageUrl && (
                <p className="py-6 text-sm text-[var(--muted)]">暂时没有更多内容。</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
