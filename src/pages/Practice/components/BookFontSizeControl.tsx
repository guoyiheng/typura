import Tooltip from '@/components/Tooltip'
import { bookFontSizeConfigAtom } from '@/store'
import { useAtom } from 'jotai'
import { Minus, Plus, Type } from 'lucide-react'

const MIN_SIZE = 16
const MAX_SIZE = 30
const STEP = 2

export function BookFontSizeControl() {
  const [fontSize, setFontSize] = useAtom(bookFontSizeConfigAtom)

  const changeSize = (direction: -1 | 1) => {
    setFontSize((current) => ({
      size: Math.max(MIN_SIZE, Math.min(MAX_SIZE, current.size + direction * STEP)),
    }))
  }

  return (
    <div className="flex h-9 items-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-1" aria-label="正文字号">
      <Type className="mx-1.5 h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
      <Tooltip content="减小正文字号" placement="bottom">
        <button
          type="button"
          onClick={() => changeSize(-1)}
          disabled={fontSize.size <= MIN_SIZE}
          className="flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] disabled:opacity-30"
          aria-label="减小正文字号"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <span className="w-7 text-center text-[10px] font-semibold text-[var(--body)] tabular-nums">{fontSize.size}</span>
      <Tooltip content="增大正文字号" placement="bottom">
        <button
          type="button"
          onClick={() => changeSize(1)}
          disabled={fontSize.size >= MAX_SIZE}
          className="flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] disabled:opacity-30"
          aria-label="增大正文字号"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  )
}
