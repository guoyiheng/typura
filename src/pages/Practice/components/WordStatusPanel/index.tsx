import { wordStatsAtom } from '@/store'
import type { Word } from '@/typings'
import { useAtomValue } from 'jotai'
import { AlertCircle, History } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'

interface WordStatusPanelProps {
  word: Word | undefined
}

const STATUS_LABELS = {
  normal: '普通',
  blurry: '模糊',
  familiar: '熟悉',
  forgotten: '忘记',
}

const STATUS_STYLES = {
  normal: 'text-[var(--muted)] bg-[var(--surface-soft)]',
  blurry: 'text-[var(--warning)] bg-[var(--warning-soft)]',
  familiar: 'text-[var(--success)] bg-[var(--success-soft)]',
  forgotten: 'text-[var(--danger)] bg-[var(--danger-soft)]',
}

export const WordStatusPanel: React.FC<WordStatusPanelProps> = ({ word }) => {
  const wordStats = useAtomValue(wordStatsAtom)

  const stats = useMemo(() => {
    if (!word) return null
    const item = wordStats[word.name] || {
      correctStreak: 0,
      status: 'normal',
      learnCount: 0,
      dictationCount: 0,
      successCount: 0,
      failCount: 0,
    }
    return {
      learnCount: item.learnCount ?? 0,
      dictationCount: item.dictationCount ?? 0,
      successCount: item.successCount ?? 0,
      failCount: item.failCount ?? 0,
      status: item.status ?? 'normal',
    }
  }, [wordStats, word])

  if (!word || !stats) return null

  return (
    <div className="practice-status mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--muted)]">
      <div className="flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        <span>成功</span>
        <span className="font-semibold text-[var(--success)]">{stats.successCount}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>失误</span>
        <span className="font-semibold text-[var(--danger)]">{stats.failCount}</span>
      </div>
      <div className="group relative flex cursor-help items-center gap-1.5">
        <span>熟练度</span>
        <span className={`rounded px-2 py-0.5 font-semibold ${STATUS_STYLES[stats.status]}`}>{STATUS_LABELS[stats.status]}</span>

        <div className="surface pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 hidden w-max -translate-x-1/2 flex-col p-3 text-xs group-hover:flex">
          <div className="mb-1.5 border-b border-[var(--line)] pb-1 font-semibold text-[var(--ink)]">状态判定</div>
          <ul className="list-disc space-y-1 pl-4 text-left text-[11px] text-[var(--body)]">
            <li>熟悉：一次无错拼写成功</li>
            <li>模糊：一次拼写错误 3 至 4 次</li>
            <li>忘记：错误不少于 5 次或查看提示</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
