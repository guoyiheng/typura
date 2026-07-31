type MetricItemProps = {
  label: string
  value: string
  suffix?: string
}

export default function MetricItem({ label, value, suffix }: MetricItemProps) {
  return (
    <div className="practice-metric flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center sm:px-4">
      <dt className="truncate text-[11px] font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1 text-[17px] leading-none font-semibold text-[var(--ink)]">
        {value}
        {suffix && <span className="text-[10px] font-medium text-[var(--muted)]">{suffix}</span>}
      </dd>
    </div>
  )
}
