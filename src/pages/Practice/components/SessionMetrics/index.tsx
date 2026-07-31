import MetricItem from './MetricItem'
import { dailyPracticeStatsAtom, normalizeDailyPracticeStats } from '@/store/dailyPracticeStats'
import { useAtomValue } from 'jotai'

export default function SessionMetrics() {
  const storedStats = useAtomValue(dailyPracticeStatsAtom)
  const stats = normalizeDailyPracticeStats(storedStats)
  const elapsedSeconds = stats.time % 60
  const elapsedMinutes = Math.floor(stats.time / 60)
  const elapsedTime = `${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`
  const keystrokeCount = stats.correctKeystrokes + stats.wrongKeystrokes
  const accuracy = keystrokeCount > 0 ? Math.round((stats.correctKeystrokes / keystrokeCount) * 100) : 0
  const effectiveWordCount =
    stats.correctKeystrokes > 0 ? Math.max(stats.attemptedWords, stats.correctKeystrokes / 5) : stats.attemptedWords
  const wpm = stats.time > 0 ? Math.round((effectiveWordCount / stats.time) * 60) : 0

  return (
    <section className="practice-metrics w-full max-w-[900px] overflow-hidden" aria-label="今日练习统计">
      <dl className="grid grid-cols-2 sm:grid-cols-5">
        <MetricItem value={elapsedTime} label="用时" />
        <MetricItem value={String(stats.attemptedWords)} label="已输入" suffix="词" />
        <MetricItem value={String(stats.correctWords)} label="一次正确" suffix="词" />
        <MetricItem value={`${accuracy}%`} label="准确率" />
        <MetricItem value={String(wpm)} label="输入速度" suffix="WPM" />
      </dl>
    </section>
  )
}
