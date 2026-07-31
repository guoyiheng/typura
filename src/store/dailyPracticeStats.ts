import { atomWithStorage } from 'jotai/utils'

const DAILY_RESET_HOUR = 3

export type DailyPracticeStats = {
  practiceDay: string
  time: number
  attemptedWords: number
  correctWords: number
  correctKeystrokes: number
  wrongKeystrokes: number
}

const toNonNegativeInteger = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0)

export const getPracticeDay = (date = new Date()) => {
  const shiftedDate = new Date(date)
  shiftedDate.setHours(shiftedDate.getHours() - DAILY_RESET_HOUR)

  const year = shiftedDate.getFullYear()
  const month = String(shiftedDate.getMonth() + 1).padStart(2, '0')
  const day = String(shiftedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createDailyPracticeStats = (date = new Date()): DailyPracticeStats => ({
  practiceDay: getPracticeDay(date),
  time: 0,
  attemptedWords: 0,
  correctWords: 0,
  correctKeystrokes: 0,
  wrongKeystrokes: 0,
})

export const normalizeDailyPracticeStats = (value: unknown, date = new Date()): DailyPracticeStats => {
  const currentPracticeDay = getPracticeDay(date)
  if (!value || typeof value !== 'object' || (value as Partial<DailyPracticeStats>).practiceDay !== currentPracticeDay) {
    return createDailyPracticeStats(date)
  }

  const stored = value as Partial<DailyPracticeStats>
  const attemptedWords = toNonNegativeInteger(stored.attemptedWords)
  return {
    practiceDay: currentPracticeDay,
    time: toNonNegativeInteger(stored.time),
    attemptedWords,
    correctWords: Math.min(toNonNegativeInteger(stored.correctWords), attemptedWords),
    correctKeystrokes: toNonNegativeInteger(stored.correctKeystrokes),
    wrongKeystrokes: toNonNegativeInteger(stored.wrongKeystrokes),
  }
}

export const getMillisecondsUntilNextPracticeDay = (date = new Date()) => {
  const nextReset = new Date(date)
  nextReset.setHours(DAILY_RESET_HOUR, 0, 0, 0)
  if (nextReset.getTime() <= date.getTime()) {
    nextReset.setDate(nextReset.getDate() + 1)
  }
  return nextReset.getTime() - date.getTime()
}

export const dailyPracticeStatsAtom = atomWithStorage<DailyPracticeStats>('dailyPracticeStats', createDailyPracticeStats(), undefined, {
  getOnInit: true,
})
