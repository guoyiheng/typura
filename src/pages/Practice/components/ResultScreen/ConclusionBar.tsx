import type { LucideIcon } from 'lucide-react'
import { CircleCheck, ThumbsUp, TriangleAlert } from 'lucide-react'

type IconMapper = {
  icon: LucideIcon
  className: string
  text: (mistakeCount: number) => string
}

const ICON_MAPPER: IconMapper[] = [
  {
    icon: CircleCheck,
    className: 'text-[var(--success)]',
    text: (mistakeCount: number) => (mistakeCount > 0 ? `本章掌握稳定，错词 ${mistakeCount} 个` : '本章全部正确'),
  },
  {
    icon: ThumbsUp,
    className: 'text-[var(--warning)]',
    text: (mistakeCount: number) => `本章有 ${mistakeCount} 个错词，建议再练一次`,
  },
  {
    icon: TriangleAlert,
    className: 'text-[var(--danger)]',
    text: (mistakeCount: number) => `本章有 ${mistakeCount} 个错词，先回看再重复练习`,
  },
]

const ConclusionBar = ({ mistakeLevel, mistakeCount }: ConclusionBarProps) => {
  const { icon: Icon, className, text } = ICON_MAPPER[mistakeLevel]

  return (
    <div className="flex min-h-12 items-center gap-2.5 border-t border-[var(--line)] px-4 py-3">
      <Icon className={`h-[18px] w-[18px] shrink-0 ${className}`} />
      <span className="text-sm font-medium text-[var(--body)]">{text(mistakeCount)}</span>
    </div>
  )
}

type ConclusionBarProps = {
  mistakeLevel: number
  mistakeCount: number
}

export default ConclusionBar
