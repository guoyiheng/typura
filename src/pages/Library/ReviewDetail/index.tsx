import type { TErrorWordData } from '../hooks/useErrorWords'
import { Button } from '@/components/ui/button'
import { currentChapterAtom, currentDictIdAtom, reviewModeInfoAtom } from '@/store'
import type { Dictionary } from '@/typings'
import { timeStamp2String } from '@/utils'
import { generateNewWordReviewRecord, useGetLatestReviewRecord } from '@/utils/db/review-record'
import * as Progress from '@radix-ui/react-progress'
import { useSetAtom } from 'jotai'
import { Clock3, ListChecks, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ReviewDetail({ errorData, dict }: { errorData: TErrorWordData[]; dict: Dictionary }) {
  const latestReviewRecord = useGetLatestReviewRecord(dict.id)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const navigate = useNavigate()
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const completedWords = latestReviewRecord ? latestReviewRecord.index + 1 : 0
  const totalReviewWords = latestReviewRecord?.words.length ?? 0
  const reviewProgress = totalReviewWords > 0 ? Math.min(100, Math.round((completedWords / totalReviewWords) * 100)) : 0

  const startReview = async () => {
    setCurrentDictId(dict.id)
    setCurrentChapter(-1)

    const record = await generateNewWordReviewRecord(dict.id, errorData)
    setReviewModeInfo({ isReviewMode: true, reviewRecord: record })
    navigate('/')
  }

  const continueReview = () => {
    setCurrentDictId(dict.id)
    setCurrentChapter(-1)

    setReviewModeInfo({ isReviewMode: true, reviewRecord: latestReviewRecord })
    navigate('/')
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center py-5">
      <header className="border-b border-[var(--line)] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)]">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          集中复习
        </div>
        <h4 className="font-display mt-2 text-2xl font-semibold text-[var(--ink)]">重新掌握易错词</h4>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">从当前词典的错词记录开始一组针对性练习。</p>
      </header>

      <div className="grid grid-cols-2 border-b border-[var(--line)] py-5">
        <div className="border-r border-[var(--line)] pr-5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            错词数量
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--ink)] tabular-nums">{errorData.length}</p>
        </div>
        <div className="pl-5">
          <p className="text-xs text-[var(--muted)]">上次进度</p>
          <p className="mt-1 text-xl font-semibold text-[var(--ink)] tabular-nums">
            {latestReviewRecord ? `${completedWords}/${totalReviewWords}` : '暂无记录'}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {latestReviewRecord && (
          <section aria-label="上次复习进度">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-[var(--body)]">继续上次复习</span>
              <span className="text-[var(--muted)] tabular-nums">{reviewProgress}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress.Root
                value={completedWords}
                max={totalReviewWords}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]"
              >
                <Progress.Indicator className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${reviewProgress}%` }} />
              </Progress.Root>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              创建于 {timeStamp2String(latestReviewRecord.createTime)}
            </p>
          </section>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {latestReviewRecord && (
            <Button type="button" className="sm:min-w-36" onClick={continueReview}>
              继续当前进度
            </Button>
          )}
          <Button type="button" variant={latestReviewRecord ? 'outline' : 'default'} className="sm:min-w-36" onClick={startReview}>
            {latestReviewRecord ? '开始新的复习' : '开始复习'}
          </Button>
        </div>
      </div>
    </div>
  )
}
