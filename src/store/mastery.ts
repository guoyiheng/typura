import { masteryRoundsAtom, wordStatsAtom } from './index'
import { getMasteryAssessment, recordMasteryResult } from '@/utils/mastery'
import { transitionMasteryRound } from '@/utils/masteryRound'
import type { MasteryEvent } from '@/utils/masteryRound'
import { atom } from 'jotai'

/** Both the terminal state and its result are written in one synchronous action. */
export const recordMasteryEventAtom = atom(
  null,
  (get, set, { scope, word, event, independent }: { scope: string; word: string; event: MasteryEvent; independent: boolean }) => {
    if (!scope || !word) return
    const rounds = get(masteryRoundsAtom)
    const current = rounds[scope] ?? { id: scope, words: {} }
    const transition = transitionMasteryRound(current, word, event, independent)
    if (transition.round === current) return
    set(masteryRoundsAtom, { ...rounds, [scope]: transition.round })
    if (transition.result === undefined) return

    const previous = get(wordStatsAtom)
    const existing = (Object.hasOwn(previous, word) ? previous[word] : undefined) ?? {
      correctStreak: 0,
      status: 'normal',
      learnCount: 0,
      dictationCount: 0,
      successCount: 0,
      failCount: 0,
    }
    const recentDictationResults = recordMasteryResult(existing.recentDictationResults, transition.result)
    set(wordStatsAtom, {
      ...previous,
      [word]: {
        ...existing,
        recentDictationResults,
        status: getMasteryAssessment(recentDictationResults).status,
        correctStreak: transition.result ? (existing.correctStreak ?? 0) + 1 : 0,
      },
    })
  },
)
