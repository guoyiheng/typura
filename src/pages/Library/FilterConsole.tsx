import { RadioGroup } from '@headlessui/react'
import { RotateCcw, Search, X } from 'lucide-react'
import { useRef } from 'react'

type FilterConsoleProps = {
  searchQuery: string
  onChangeSearchQuery: (query: string) => void
  categories: string[]
  currentCategory: string
  onChangeCategory: (category: string) => void
  tags: string[]
  currentTag: string
  onChangeTag: (tag: string) => void
  onResetFilters: () => void
  totalCount: number
}

function FilterOptions({
  label,
  options,
  value,
  allLabel,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  allLabel: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-3 border-t border-[var(--line)] py-3 sm:grid-cols-[88px_1fr] sm:items-start">
      <span className="pt-1.5 text-xs font-semibold text-[var(--muted)]">{label}</span>
      <RadioGroup value={value} onChange={onChange}>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: 'ALL', label: allLabel }, ...options.map((option) => ({ value: option, label: option }))].map((option) => (
            <RadioGroup.Option key={option.value} value={option.value} className="focus:outline-none">
              {({ checked }) => (
                <div
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    checked
                      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                      : 'bg-[var(--surface-soft)] text-[var(--body)] hover:text-[var(--ink)]'
                  }`}
                >
                  {option.label}
                </div>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}

export function FilterConsole({
  searchQuery,
  onChangeSearchQuery,
  categories,
  currentCategory,
  onChangeCategory,
  tags,
  currentTag,
  onChangeTag,
  onResetFilters,
  totalCount,
}: FilterConsoleProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasFilters = Boolean(searchQuery || currentCategory !== 'ALL' || currentTag !== 'ALL')

  return (
    <section className="border-y border-[var(--line)]" aria-label="词典筛选">
      <div className="grid grid-cols-2 items-center gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
        <label className="relative col-span-2 min-w-0 sm:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={inputRef}
            type="search"
            aria-label="搜索词典"
            value={searchQuery}
            onChange={(event) => onChangeSearchQuery(event.target.value)}
            placeholder="搜索词典、分类或标签"
            className="h-10 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] pr-10 pl-10 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
          />
          {searchQuery && (
            <button
              type="button"
              className="icon-button absolute top-0.5 right-0.5"
              onClick={() => onChangeSearchQuery('')}
              aria-label="清空搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="col-span-2 flex min-h-10 items-center justify-between gap-3 sm:col-span-1 sm:min-h-0 sm:justify-start">
          <span className="shrink-0 text-xs font-medium text-[var(--muted)]">
            <strong className="text-[var(--ink)]">{totalCount}</strong> 本可用
          </span>
          {hasFilters && (
            <button type="button" className="icon-button" onClick={onResetFilters} aria-label="重置筛选" title="重置筛选">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <FilterOptions label="学习场景" options={categories} value={currentCategory} allLabel="全部" onChange={onChangeCategory} />
      {tags.length > 0 && <FilterOptions label="内容类型" options={tags} value={currentTag} allLabel="全部" onChange={onChangeTag} />}
    </section>
  )
}
