import { Star } from 'lucide-react'

export function BookCover({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-[var(--surface-dark)] text-[var(--on-dark)] shadow-[var(--shadow)] ${
        compact ? 'h-28 w-[4.7rem]' : 'aspect-[2/3] w-full max-w-48'
      }`}
      aria-hidden="true"
    >
      <div className="absolute top-[12%] right-[16%] text-[#d7ad4b]">
        <Star className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} fill="currentColor" strokeWidth={1.5} />
      </div>
      <div className="absolute top-[29%] left-[13%] h-px w-[42%] bg-[var(--dark-line-strong)]" />
      <div className="font-display absolute top-[19%] left-[13%] text-[9px] leading-tight text-[var(--on-dark-muted)] uppercase">
        A learner&apos;s
        <br />
        retelling
      </div>
      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-full border border-[#d7ad4b] bg-[#d7ad4b] ${
          compact ? '-bottom-7 h-20 w-20' : '-bottom-14 h-40 w-40'
        }`}
      />
      <div
        className={`absolute left-1/2 -translate-x-1/2 bg-[#efe6d4] ${compact ? 'bottom-[22%] h-8 w-1.5' : 'bottom-[23%] h-16 w-2.5'}`}
      />
      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-[#efe6d4] ${
          compact ? 'bottom-[48%] h-3 w-3' : 'bottom-[49%] h-5 w-5'
        }`}
      />
      <div
        className={`absolute rotate-[-18deg] bg-[#bd6654] ${
          compact ? 'bottom-[37%] left-[48%] h-0.5 w-6' : 'bottom-[39%] left-[48%] h-1 w-11'
        }`}
      />
      <div className="absolute right-[29%] bottom-[31%] h-5 w-px rotate-12 bg-[#397a50]" />
      <div className="absolute right-[24%] bottom-[42%] h-2 w-3 rotate-[-25deg] rounded-full bg-[#397a50]" />
    </div>
  )
}
