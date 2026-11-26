import Tooltip from '@/components/Tooltip'
import type { WordbookEntry } from '@/store/wordbook'
import { formatTransByPOS } from '@/utils'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { BookMarked, Play, X } from 'lucide-react'

type WordbookButtonProps = {
  entries: WordbookEntry[]
  /** 当前是否正在练习生词本 */
  isActive: boolean
  /** 当前单词已收藏时的键值，用于高亮入口 */
  currentEntryKey?: string
  addShortcutLabel: string
  onRemove: (entry: WordbookEntry) => void
  onSelect: (entry: WordbookEntry) => void
  onPractice: () => void
}

export default function WordbookButton({
  entries,
  isActive,
  currentEntryKey,
  addShortcutLabel,
  onRemove,
  onSelect,
  onPractice,
}: WordbookButtonProps) {
  const isCurrentCollected = Boolean(currentEntryKey) && entries.some((entry) => entry.word === currentEntryKey)
  const isEntryCollected = isCurrentCollected || isActive

  return (
    <Popover className="relative z-30 inline-flex shrink-0 items-center">
      {({ open }) => (
        <>
          <Tooltip content={`生词本 (${entries.length})`} placement="bottom" disabled={open}>
            <PopoverButton
              className={`icon-button relative ${open || isActive ? 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)]' : ''} ${
                isEntryCollected && !open ? 'text-[var(--primary)]' : ''
              }`}
              aria-label={`打开生词本，共 ${entries.length} 个单词`}
            >
              <BookMarked className="h-[18px] w-[18px]" aria-hidden="true" />
              {entries.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 font-mono text-[10px] font-semibold text-[var(--on-primary)] tabular-nums">
                  {entries.length > 99 ? '99+' : entries.length}
                </span>
              )}
            </PopoverButton>
          </Tooltip>

          <Transition
            enter="transition duration-150 ease-out"
            enterFrom="translate-y-1 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transition duration-100 ease-in"
            leaveFrom="translate-y-0 opacity-100"
            leaveTo="translate-y-1 opacity-0"
          >
            <PopoverPanel
              anchor={{ to: 'bottom start', gap: 8, padding: 16 }}
              className="surface z-[210] flex h-[30rem] w-[min(23rem,calc(100vw-2rem))] flex-col p-2.5"
              aria-label="生词本"
            >
              {({ close }) => (
                <>
                  <div className="mb-2 flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-1 pb-2 select-none">
                    <span className="text-sm font-semibold text-[var(--ink)]">生词本</span>
                    <span className="shrink-0 rounded bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                      {entries.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="primary-button mb-2 min-h-9 w-full shrink-0 gap-2 text-xs"
                    disabled={entries.length === 0}
                    onClick={() => {
                      onPractice()
                      close()
                    }}
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    {isActive ? '继续练习生词本' : '开始练习生词本'}
                  </button>

                  {entries.length > 0 ? (
                    <div className="customized-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                      {entries.map((entry) => (
                        <div
                          key={entry.word}
                          className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[var(--line)] hover:bg-[var(--surface-soft)]"
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
                            onClick={() => {
                              onSelect(entry)
                              close()
                            }}
                            title={`在生词本中练习 ${entry.word}`}
                          >
                            <span className="block truncate text-sm font-semibold text-[var(--ink)]">{entry.word}</span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                              {formatTransByPOS(entry.trans).join('；')}
                            </span>
                            {entry.dictName && (
                              <span className="mt-1 block truncate text-[11px] text-[var(--muted)] opacity-75">{entry.dictName}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            className="icon-button h-7 w-7 flex-[0_0_28px] opacity-60 group-hover:opacity-100 hover:text-[var(--danger)]"
                            onClick={() => onRemove(entry)}
                            aria-label={`将 ${entry.word} 移出生词本`}
                            title="移出生词本"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                      <BookMarked className="h-6 w-6 text-[var(--muted)]" aria-hidden="true" />
                      <p className="text-sm font-semibold text-[var(--body)]">生词本还是空的</p>
                      <p className="text-xs leading-5 text-[var(--muted)]">
                        遇到想再练的单词，按{' '}
                        <kbd className="rounded border border-[var(--line-strong)] bg-[var(--surface)] px-1 py-0.5 font-mono text-[10px] font-semibold text-[var(--muted)]">
                          {addShortcutLabel}
                        </kbd>{' '}
                        收进来。
                      </p>
                    </div>
                  )}

                  <p className="mt-2 shrink-0 border-t border-[var(--line)] px-1 pt-2 text-[11px] leading-4 text-[var(--muted)] select-none">
                    按{' '}
                    <kbd className="rounded border border-[var(--line-strong)] bg-[var(--surface)] px-1 py-0.5 font-mono text-[10px] font-semibold text-[var(--muted)]">
                      {addShortcutLabel}
                    </kbd>{' '}
                    收藏或取消当前单词
                  </p>
                </>
              )}
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
