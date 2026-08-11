import { BookShelf } from './BookShelf'
import DictionaryGroup from './CategoryDicts'
import { FilterConsole } from './FilterConsole'
import { LanguageTabSwitcher } from './LanguageTabSwitcher'
import Layout from '@/components/Layout'
import { dictionaries } from '@/resources/dictionary'
import { currentDictInfoAtom } from '@/store'
import type { LanguageCategoryType } from '@/typings'
import groupBy from '@/utils/groupBy'
import { useAtomValue } from 'jotai'
import { ArrowLeft, BookOpenText, Library, LibraryBig, SearchX } from 'lucide-react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Updater } from 'use-immer'
import { useImmer } from 'use-immer'

export type LibraryFilters = {
  language: LanguageCategoryType
  category: string
  tag: string
  query: string
}

const initialFilters: LibraryFilters = {
  language: 'en',
  category: 'ALL',
  tag: 'ALL',
  query: '',
}

export const LibraryContext = createContext<{
  filters: LibraryFilters
  updateFilters: Updater<LibraryFilters>
} | null>(null)

export default function LibraryPage() {
  const [filters, updateFilters] = useImmer<LibraryFilters>(initialFilters)
  const navigate = useNavigate()
  const activeDictionary = useAtomValue(currentDictInfoAtom)
  const [libraryMode, setLibraryMode] = useState<'dictionary' | 'book'>(() =>
    activeDictionary.contentType === 'book' ? 'book' : 'dictionary',
  )

  const dictionariesForLanguage = useMemo(
    () => dictionaries.filter((dictionary) => dictionary.languageCategory === filters.language),
    [filters.language],
  )

  const searchResults = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    if (!query) return dictionariesForLanguage

    return dictionariesForLanguage.filter((dictionary) => {
      return [dictionary.name, dictionary.description, dictionary.category, dictionary.id, ...(dictionary.tags ?? [])]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(query))
    })
  }, [dictionariesForLanguage, filters.query])

  const categories = useMemo(
    () => Array.from(new Set(searchResults.map((dictionary) => dictionary.category).filter(Boolean))),
    [searchResults],
  )

  const dictionariesForCategory = useMemo(() => {
    if (filters.category === 'ALL') return searchResults
    return searchResults.filter((dictionary) => dictionary.category === filters.category)
  }, [filters.category, searchResults])

  const tags = useMemo(
    () => Array.from(new Set(dictionariesForCategory.flatMap((dictionary) => dictionary.tags ?? []))),
    [dictionariesForCategory],
  )

  const visibleDictionaries = useMemo(() => {
    if (filters.tag === 'ALL') return dictionariesForCategory
    return dictionariesForCategory.filter((dictionary) => dictionary.tags?.includes(filters.tag))
  }, [dictionariesForCategory, filters.tag])

  const dictionaryGroups = useMemo(() => {
    return Object.entries(groupBy(visibleDictionaries, (dictionary) => dictionary.category))
  }, [visibleDictionaries])

  const resetFilters = useCallback(() => {
    updateFilters((draft) => {
      draft.query = ''
      draft.category = 'ALL'
      draft.tag = 'ALL'
    })
  }, [updateFilters])

  useEffect(() => {
    if (activeDictionary.contentType === 'book') return
    updateFilters((draft) => {
      draft.language = activeDictionary.languageCategory
      draft.category = activeDictionary.category || 'ALL'
      draft.tag = activeDictionary.tags?.[0] || 'ALL'
    })
  }, [activeDictionary, updateFilters])

  return (
    <Layout>
      <LibraryContext.Provider value={{ filters, updateFilters }}>
        <div className="customized-scrollbar min-h-0 w-full flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7">
          <header className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-[var(--line)] pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-raised)] shadow-sm">
                <img className="h-8 w-8" src="/typura-mark.svg" alt="" aria-hidden="true" />
              </span>
              <div className="font-display text-xl font-semibold text-[var(--ink)]">Typura 纯键</div>
            </div>
            <button type="button" className="secondary-button" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              返回练习
            </button>
          </header>

          <main className="mx-auto mt-10 max-w-[1440px]">
            <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--primary)]">
                  <Library className="h-4 w-4" />
                  学习资料库
                </div>
                <h1 className="font-display text-4xl leading-none font-semibold text-[var(--ink)]">
                  {libraryMode === 'dictionary' ? '选择下一组练习' : '选择一本书开始阅读'}
                </h1>
              </div>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                <div
                  className="inline-flex items-center rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-1"
                  aria-label="资料类型"
                >
                  <button
                    type="button"
                    onClick={() => setLibraryMode('dictionary')}
                    className={`flex h-8 items-center gap-2 rounded px-3 text-xs font-semibold transition-colors ${
                      libraryMode === 'dictionary'
                        ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                    aria-pressed={libraryMode === 'dictionary'}
                  >
                    <LibraryBig className="h-3.5 w-3.5" />
                    词典
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryMode('book')}
                    className={`flex h-8 items-center gap-2 rounded px-3 text-xs font-semibold transition-colors ${
                      libraryMode === 'book'
                        ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                    aria-pressed={libraryMode === 'book'}
                  >
                    <BookOpenText className="h-3.5 w-3.5" />
                    书籍
                  </button>
                </div>
                {libraryMode === 'dictionary' && <LanguageTabSwitcher />}
              </div>
            </div>

            {libraryMode === 'dictionary' ? (
              <>
                <FilterConsole
                  searchQuery={filters.query}
                  onChangeSearchQuery={(query) =>
                    updateFilters((draft) => {
                      draft.query = query
                    })
                  }
                  categories={categories}
                  currentCategory={filters.category}
                  onChangeCategory={(category) =>
                    updateFilters((draft) => {
                      draft.category = category
                      draft.tag = 'ALL'
                    })
                  }
                  tags={tags}
                  currentTag={filters.tag}
                  onChangeTag={(tag) =>
                    updateFilters((draft) => {
                      draft.tag = tag
                    })
                  }
                  onResetFilters={resetFilters}
                  totalCount={visibleDictionaries.length}
                />

                <div className="mt-9 flex flex-col gap-12 pb-16">
                  {dictionaryGroups.length > 0 ? (
                    dictionaryGroups.map(([category, categoryDictionaries]) => (
                      <DictionaryGroup key={category} category={category} dicts={categoryDictionaries} />
                    ))
                  ) : (
                    <div className="flex min-h-72 flex-col items-center justify-center border-y border-[var(--line)] text-center">
                      <SearchX className="h-7 w-7 text-[var(--muted)]" />
                      <p className="mt-4 font-semibold text-[var(--ink)]">没有匹配的词典</p>
                      <button type="button" className="secondary-button mt-5" onClick={resetFilters}>
                        清除筛选
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-9 pb-16">
                <BookShelf />
              </div>
            )}
          </main>
        </div>
      </LibraryContext.Provider>
    </Layout>
  )
}
