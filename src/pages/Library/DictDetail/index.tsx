import { useDeleteWordRecord } from '../../../utils/db'
import Chapter from '../Chapter'
import { ErrorTable } from '../ErrorTable'
import { getRowsFromErrorWordData } from '../ErrorTable/columns'
import { ReviewDetail } from '../ReviewDetail'
import useErrorWordData from '../hooks/useErrorWords'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  chapterLengthAtom,
  currentChapterAtom,
  currentDictIdAtom,
  dictationProgressAtom,
  learnProgressAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import type { Dictionary } from '@/typings'
import { getDictionaryChapterCount } from '@/utils'
import range from '@/utils/range'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { BookOpenText, LibraryBig, ListChecks, RotateCcw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

enum LibraryTab {
  Chapters = 'chapters',
  Errors = 'errors',
  Review = 'review',
}

export default function DictionaryDetail({ dictionary }: { dictionary: Dictionary }) {
  const [activeChapter, setActiveChapter] = useAtom(currentChapterAtom)
  const [activeDictionaryId, setActiveDictionaryId] = useAtom(currentDictIdAtom)
  const isDictationMode = useAtomValue(wordDictationConfigAtom).isOpen
  const chapterLength = useAtomValue(chapterLengthAtom)
  const learnProgress = useAtomValue(learnProgressAtom)
  const dictationProgress = useAtomValue(dictationProgressAtom)
  const savedProgress = (isDictationMode ? dictationProgress : learnProgress)[dictionary.id]
  const [activeTab, setActiveTab] = useState<LibraryTab>(LibraryTab.Chapters)
  const setReviewMode = useSetAtom(reviewModeInfoAtom)
  const navigate = useNavigate()
  const { deleteWordRecord } = useDeleteWordRecord()
  const [refreshToken, setRefreshToken] = useState(false)
  const [chapterPage, setChapterPage] = useState(1)
  const CHAPTERS_PER_PAGE = 60
  const chapterCount = getDictionaryChapterCount(dictionary, chapterLength)
  const totalPages = Math.ceil(chapterCount / CHAPTERS_PER_PAGE)

  const visibleChapterRange = useMemo(() => {
    const start = (chapterPage - 1) * CHAPTERS_PER_PAGE
    const end = Math.min(chapterCount, start + CHAPTERS_PER_PAGE)
    return range(start, end, 1)
  }, [chapterCount, chapterPage])

  const selectedChapter = useMemo(() => {
    return dictionary.id === activeDictionaryId ? activeChapter : (savedProgress?.chapter ?? 0)
  }, [activeChapter, activeDictionaryId, dictionary.id, savedProgress?.chapter])
  const resumeChapter = selectedChapter >= 0 ? selectedChapter : (savedProgress?.chapter ?? 0)

  const { errorWordData, isLoading, error } = useErrorWordData(dictionary, refreshToken)
  const errorRows = useMemo(() => getRowsFromErrorWordData(errorWordData), [errorWordData])
  const activeTabCopy =
    activeTab === LibraryTab.Chapters
      ? { title: '章节目录', description: '选择一个章节，继续当前学习进度或从任意位置开始。' }
      : activeTab === LibraryTab.Errors
        ? { title: '错词记录', description: '查看练习中反复出错的词条，并整理需要再次掌握的内容。' }
        : { title: '集中复习', description: '基于当前词典的错词记录，开始一组针对性练习。' }

  const deleteErrorWord = useCallback(
    async (word: string) => {
      await deleteWordRecord(word, dictionary.id)
      setRefreshToken((current) => !current)
    },
    [deleteWordRecord, dictionary.id],
  )

  const openChapter = useCallback(
    (chapterIndex: number) => {
      setActiveDictionaryId(dictionary.id)
      setActiveChapter(chapterIndex)
      setReviewMode((current) => ({ ...current, isReviewMode: false }))
      navigate('/')
    },
    [dictionary.id, navigate, setActiveChapter, setActiveDictionaryId, setReviewMode],
  )

  return (
    <div className="flex h-[min(44rem,calc(100dvh-2rem))] w-full flex-col text-[var(--body)]">
      <header className="relative overflow-hidden bg-[var(--surface-dark)] px-5 py-6 text-[var(--on-dark)] sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute top-0 right-0 h-full w-1/3 border-l border-[var(--dark-line)] opacity-60"
          aria-hidden="true"
        />
        <div className="relative grid gap-7 pr-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12 md:pr-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--on-dark-muted)]">
              <LibraryBig className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
              <span>{dictionary.category}</span>
              <span className="h-0.5 w-0.5 rounded-full bg-[var(--dark-line-strong)]" aria-hidden="true" />
              <span>{dictionary.language.toUpperCase()}</span>
            </div>
            <h2 className="font-display mt-3 max-w-xl text-3xl leading-[1.08] font-medium sm:text-4xl">{dictionary.name}</h2>
            <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-5 text-[var(--on-dark-muted)] sm:text-sm sm:leading-6">
              {dictionary.description}
            </p>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-[var(--dark-line-strong)] border-y border-[var(--dark-line-strong)] py-3 md:min-w-64 md:border-y-0 md:border-l md:py-0 md:pl-7">
            <div className="pr-4 md:pr-5">
              <dt className="text-[10px] font-medium text-[var(--on-dark-muted)]">章节</dt>
              <dd className="font-display mt-1 text-xl leading-none font-medium tabular-nums sm:text-2xl">{chapterCount}</dd>
            </div>
            <div className="px-4 md:px-5">
              <dt className="text-[10px] font-medium text-[var(--on-dark-muted)]">词条</dt>
              <dd className="font-display mt-1 text-xl leading-none font-medium tabular-nums sm:text-2xl">
                {dictionary.length.toLocaleString('zh-CN')}
              </dd>
            </div>
            <div className="pl-4 md:pl-5">
              <dt className="text-[10px] font-medium text-[var(--on-dark-muted)]">继续</dt>
              <dd className="font-display mt-1 text-xl leading-none font-medium text-[var(--primary)] tabular-nums sm:text-2xl">
                {resumeChapter + 1}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[var(--surface)] px-5 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-6">
        <div className="flex flex-col-reverse gap-4 border-b border-[var(--line)] sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="pb-4">
            <h3 className="font-display text-xl leading-none font-medium text-[var(--ink)]">{activeTabCopy.title}</h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--muted)]">{activeTabCopy.description}</p>
          </div>
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(tab) => tab && setActiveTab(tab as LibraryTab)}
            aria-label="词典详情视图"
            className="flex w-full justify-start gap-5 sm:w-auto sm:gap-6"
          >
            <ToggleGroupItem
              value={LibraryTab.Chapters}
              className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs text-[var(--muted)] hover:bg-transparent data-[state=on]:border-[var(--primary)] data-[state=on]:bg-transparent data-[state=on]:text-[var(--ink)]"
            >
              <BookOpenText className="mr-1.5 h-3.5 w-3.5" />
              章节
            </ToggleGroupItem>
            {errorWordData.length > 0 && (
              <>
                <ToggleGroupItem
                  value={LibraryTab.Errors}
                  className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs text-[var(--muted)] hover:bg-transparent data-[state=on]:border-[var(--primary)] data-[state=on]:bg-transparent data-[state=on]:text-[var(--ink)]"
                >
                  <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                  错词 <span className="ml-1 text-[10px] tabular-nums opacity-70">{errorWordData.length}</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={LibraryTab.Review}
                  className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs text-[var(--muted)] hover:bg-transparent data-[state=on]:border-[var(--primary)] data-[state=on]:bg-transparent data-[state=on]:text-[var(--ink)]"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  复习
                </ToggleGroupItem>
              </>
            )}
          </ToggleGroup>
        </div>

        <Tabs value={activeTab} className="mt-4 min-h-0 w-full flex-1 sm:mt-5">
          <TabsContent value={LibraryTab.Chapters} className="mt-0 flex h-full flex-col focus:outline-none">
            {totalPages > 1 && (
              <div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                <span className="text-[var(--muted)]">
                  共 {chapterCount} 章 (显示第 {visibleChapterRange[0] + 1} - {visibleChapterRange[visibleChapterRange.length - 1] + 1} 章)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={chapterPage <= 1}
                    onClick={() => setChapterPage((p) => Math.max(1, p - 1))}
                    className="secondary-button h-7 min-h-0 px-2.5 text-xs disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <span className="font-semibold text-[var(--ink)]">
                    {chapterPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={chapterPage >= totalPages}
                    onClick={() => setChapterPage((p) => Math.min(totalPages, p + 1))}
                    className="secondary-button h-7 min-h-0 px-2.5 text-xs disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
            <ScrollArea className="h-full pr-3">
              <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-4">
                {visibleChapterRange.map((chapterIndex) => (
                  <Chapter
                    key={`${dictionary.id}-${chapterIndex}`}
                    index={chapterIndex}
                    checked={selectedChapter === chapterIndex}
                    dictID={dictionary.id}
                    onChange={openChapter}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value={LibraryTab.Errors} className="mt-0 h-full focus:outline-none">
            <ErrorTable data={errorRows} isLoading={isLoading} error={error} onDelete={deleteErrorWord} />
          </TabsContent>
          <TabsContent value={LibraryTab.Review} className="mt-0 h-full focus:outline-none">
            <ReviewDetail errorData={errorWordData} dict={dictionary} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
