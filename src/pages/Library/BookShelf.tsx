import { BookCover } from './BookCover'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { books } from '@/resources/books'
import { currentChapterAtom, currentDictIdAtom, learnProgressAtom, reviewModeInfoAtom, wordDictationConfigAtom } from '@/store'
import type { Dictionary } from '@/typings'
import { getDictionaryChapter } from '@/utils'
import { useAtomValue, useSetAtom } from 'jotai'
import { ArrowUpRight, BookOpenText, Check, CircleDot } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function BookDetail({ book }: { book: Dictionary }) {
  const activeResourceId = useAtomValue(currentDictIdAtom)
  const activeChapter = useAtomValue(currentChapterAtom)
  const progress = useAtomValue(learnProgressAtom)[book.id]
  const setActiveResourceId = useSetAtom(currentDictIdAtom)
  const setActiveChapter = useSetAtom(currentChapterAtom)
  const setReviewMode = useSetAtom(reviewModeInfoAtom)
  const setDictation = useSetAtom(wordDictationConfigAtom)
  const setLearnProgress = useSetAtom(learnProgressAtom)
  const navigate = useNavigate()
  const selectedChapter = activeResourceId === book.id ? activeChapter : (progress?.chapter ?? 0)

  const openChapter = useCallback(
    (chapterIndex: number) => {
      const resumeIndex = progress?.chapter === chapterIndex ? progress.index : 0
      setActiveResourceId(book.id)
      setActiveChapter(chapterIndex)
      setLearnProgress((current) => ({
        ...current,
        [book.id]: { chapter: chapterIndex, index: resumeIndex },
      }))
      setReviewMode((current) => ({ ...current, isReviewMode: false }))
      setDictation((current) => ({ ...current, isOpen: false, openBy: 'user' }))
      navigate('/')
    },
    [book.id, navigate, progress?.chapter, progress?.index, setActiveChapter, setActiveResourceId, setDictation, setLearnProgress, setReviewMode],
  )

  return (
    <div className="flex max-h-[min(46rem,calc(100dvh-2rem))] min-h-0 flex-col overflow-hidden bg-[var(--surface)] text-[var(--body)]">
      <header className="grid shrink-0 gap-6 border-b border-[var(--line)] px-6 py-7 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-end sm:px-8">
        <div className="hidden sm:block">
          <BookCover />
        </div>
        <div className="min-w-0 pr-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--primary)]">
            <BookOpenText className="h-3.5 w-3.5" />
            英文文学 · 学习改写版
          </div>
          <h2 className="font-display mt-3 text-3xl leading-none font-semibold text-[var(--ink)] sm:text-4xl">{book.name}</h2>
          <p className="mt-2 text-sm font-medium text-[var(--body)]">{book.subtitle}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{book.author}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">{book.description}</p>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--line)] pt-4 text-xs">
            <div>
              <dt className="text-[var(--muted)]">章节</dt>
              <dd className="mt-1 font-semibold text-[var(--ink)] tabular-nums">{book.chapterCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">练习词数</dt>
              <dd className="mt-1 font-semibold text-[var(--ink)] tabular-nums">{book.length.toLocaleString('zh-CN')}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">继续章节</dt>
              <dd className="mt-1 font-semibold text-[var(--primary)] tabular-nums">{selectedChapter + 1}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="customized-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6" aria-labelledby="book-chapters">
        <div className="flex items-end justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <p className="text-[10px] font-semibold text-[var(--primary)]">CONTENTS</p>
            <h3 id="book-chapters" className="font-display mt-2 text-2xl leading-none font-medium text-[var(--ink)]">
              选择章节
            </h3>
          </div>
          <span className="text-xs text-[var(--muted)]">从任意章节开始或继续上次位置</span>
        </div>

        <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
          {book.chapters?.map((chapter, index) => {
            const chapterInfo = getDictionaryChapter(book, index)
            const savedIndex =
              index < (progress?.chapter ?? 0) ? (chapterInfo?.wordCount ?? 0) : index === progress?.chapter ? progress.index : 0
            const isComplete = savedIndex >= (chapterInfo?.wordCount ?? 0)
            const isCurrent = selectedChapter === index

            return (
              <button
                key={chapter.name}
                type="button"
                onClick={() => openChapter(index)}
                className={`group grid min-h-20 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-1 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-none ${
                  isCurrent ? 'border-transparent bg-[var(--primary-soft)] px-3' : 'border-[var(--line)] hover:bg-[var(--surface-soft)]'
                }`}
                aria-label={`第 ${index + 1} 章，${chapter.name}`}
              >
                <span className={`font-display text-xl tabular-nums ${isCurrent ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">{chapter.name}</span>
                  <span className="mt-1 block text-[10px] text-[var(--muted)] tabular-nums">
                    {savedIndex}/{chapterInfo?.wordCount ?? 0} 词
                  </span>
                </span>
                <span className={isComplete ? 'text-[var(--success)]' : isCurrent ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}>
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <CircleDot className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function BookShelf() {
  const activeResourceId = useAtomValue(currentDictIdAtom)
  const progressMap = useAtomValue(learnProgressAtom)

  return (
    <section aria-labelledby="bookshelf-title">
      <header className="grid gap-3 border-b border-[var(--line-strong)] pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-semibold text-[var(--primary)]">书籍目录</p>
          <h2 id="bookshelf-title" className="font-display text-3xl leading-none font-medium text-[var(--ink)]">
            英文阅读
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)] tabular-nums">{books.length}</span> 本书可供练习
        </p>
      </header>

      <div>
        {books.map((book) => {
          const isActive = activeResourceId === book.id
          const progress = progressMap[book.id]
          const completedChapters = progress?.chapter ?? 0
          const progressPercent = Math.min(100, Math.round((completedChapters / book.chapterCount) * 100))

          return (
            <Dialog key={book.id}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={`group grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-5 border-b px-2 py-6 text-left transition-colors focus-visible:z-10 focus-visible:outline-none md:grid-cols-[5.5rem_minmax(0,1.5fr)_minmax(10rem,0.6fr)_12rem] ${
                    isActive ? 'border-transparent bg-[var(--primary-soft)]' : 'border-[var(--line)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <BookCover compact />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-display truncate text-2xl font-semibold text-[var(--ink)]">{book.name}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-[var(--body)]">{book.subtitle}</span>
                    <span className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{book.description}</span>
                  </span>
                  <span className="col-start-2 text-xs text-[var(--muted)] md:col-start-auto">
                    <span className="block font-medium text-[var(--body)]">{book.author}</span>
                    <span className="mt-1 block tabular-nums">
                      {book.chapterCount} 章 · {book.length.toLocaleString('zh-CN')} 词
                    </span>
                  </span>
                  <span className="col-start-2 flex items-center gap-3 md:col-start-auto">
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${progressPercent}%` }} />
                    </span>
                    <span className="text-xs font-semibold text-[var(--ink)] tabular-nums">{progressPercent}%</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-[920px] overflow-hidden p-0">
                <BookDetail book={book} />
              </DialogContent>
            </Dialog>
          )
        })}
      </div>
    </section>
  )
}
