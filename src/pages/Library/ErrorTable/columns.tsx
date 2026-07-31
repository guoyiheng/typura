import type { TErrorWordData } from '../hooks/useErrorWords'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Trash2 } from 'lucide-react'

export type ErrorColumn = {
  word: string
  trans: string
  errorCount: number
  errorChar: string[]
}

export const errorColumns = (onDelete: (word: string) => Promise<void>): ColumnDef<ErrorColumn>[] => [
  {
    accessorKey: 'word',
    size: 100,
    header: ({ column }) => {
      return (
        <Button variant="ghost" className="p-0" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          单词
          <ArrowUpDown className="ml-1.5 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="min-w-0">
          <p className="truncate font-mono font-semibold text-[var(--ink)]">{row.original.word}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)] md:hidden">{row.original.trans}</p>
        </div>
      )
    },
  },
  {
    accessorKey: 'trans',
    size: 500,
    header: '释义',
  },
  {
    accessorKey: 'errorCount',
    size: 40,
    header: ({ column }) => {
      return (
        <Button variant="ghost" className="p-0" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          <span className="sm:hidden">错误</span>
          <span className="hidden sm:inline">错误次数</span>
          <ArrowUpDown className="ml-1.5 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <span className="flex justify-center font-semibold text-[var(--danger)] tabular-nums">{row.original.errorCount}</span>
    },
  },
  {
    accessorKey: 'errorChar',
    header: '易错字母',
    size: 100,
    cell: ({ row }) => {
      return (
        <div className="flex flex-wrap gap-1">
          {(row.getValue('errorChar') as string[]).map((char, index) => (
            <kbd
              className="inline-flex min-h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-[var(--surface-soft)] px-1 font-mono text-xs text-[var(--body)]"
              key={`${char}-${index}`}
            >
              {char}
            </kbd>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'delete',
    header: '',
    size: 40,
    cell: ({ row }) => {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="icon-button"
                onClick={() => onDelete(row.original.word)}
                aria-label={`删除 ${row.original.word} 的记录`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>删除记录</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
]

export function getRowsFromErrorWordData(data: TErrorWordData[]): ErrorColumn[] {
  return data.map((item) => {
    return {
      word: item.word,
      trans: item.originData.trans.join('，') ?? '',
      errorCount: item.errorCount,
      errorChar: item.errorChar,
    }
  })
}
