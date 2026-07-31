import DictionaryEntry from './DictionaryWithoutCover'
import type { Dictionary } from '@/typings'

export default function DictionaryGroup({ category, dicts }: { category: string; dicts: Dictionary[] }) {
  return (
    <section>
      <header className="grid gap-3 border-b border-[var(--line-strong)] pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-semibold text-[var(--primary)]">词典目录</p>
          <h2 className="font-display text-3xl leading-none font-medium text-[var(--ink)]">{category}</h2>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)] tabular-nums">{dicts.length}</span> 本词典可供练习
        </p>
      </header>

      <div className="hidden grid-cols-[4rem_minmax(0,1.4fr)_minmax(9rem,0.7fr)_12rem] gap-5 border-b border-[var(--line)] px-3 py-3 text-[10px] font-semibold text-[var(--muted)] md:grid">
        <span>序号</span>
        <span>词典</span>
        <span>内容类型</span>
        <span>学习进度</span>
      </div>

      <div>
        {dicts.map((dictionary, index) => (
          <DictionaryEntry key={`${dictionary.id}-${index}`} dictionary={dictionary} ordinal={index + 1} />
        ))}
      </div>
    </section>
  )
}
