import type { LucideIcon } from 'lucide-react'

type ResultMetricProps = {
  icon: LucideIcon
  label: string
  value: string
}

export default function ResultMetric({ icon: Icon, label, value }: ResultMetricProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--primary)]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
        <dd className="font-display mt-0.5 truncate text-2xl leading-none font-semibold text-[var(--ink)] tabular-nums">{value}</dd>
      </div>
    </div>
  )
}
