export type MasteryAttempt = 'eligible' | 'excluded' | 'success' | 'failure'

export type MasteryEvent = 'begin' | 'expose' | 'fail' | 'complete'

export type MasteryRound = {
  id: string
  words: Record<string, MasteryAttempt>
}

export type MasteryAttemptTransition = {
  attempt: MasteryAttempt
  result?: boolean
}

const terminalAttempts = new Set<MasteryAttempt>(['excluded', 'success', 'failure'])

/**
 * Apply one event to a word in a round. Terminal states are sticky, so a
 * repeated completion, correction, or delayed event cannot add another result.
 */
export function transitionMasteryAttempt(
  current: MasteryAttempt | undefined,
  event: MasteryEvent,
  independent: boolean,
): MasteryAttemptTransition {
  if (current && terminalAttempts.has(current)) return { attempt: current }

  switch (event) {
    case 'begin':
      if (current === undefined) return { attempt: independent ? 'eligible' : 'excluded' }
      return current === 'eligible' && !independent ? { attempt: 'failure', result: false } : { attempt: current }
    case 'expose':
      if (current === undefined) return { attempt: 'excluded' }
      return current === 'eligible' ? { attempt: 'failure', result: false } : { attempt: current }
    case 'fail':
      if (current !== 'eligible') return { attempt: current ?? 'excluded' }
      return { attempt: 'failure', result: false }
    case 'complete':
      if (current !== 'eligible') return { attempt: current ?? 'excluded' }
      return independent ? { attempt: 'success', result: true } : { attempt: 'failure', result: false }
  }
}

/** Apply an event immutably to one word in a persisted round. */
export function transitionMasteryRound(
  round: MasteryRound,
  wordKey: string,
  event: MasteryEvent,
  independent: boolean,
): { round: MasteryRound; result?: boolean } {
  const previous = Object.hasOwn(round.words, wordKey) ? round.words[wordKey] : undefined
  const transition = transitionMasteryAttempt(previous, event, independent)
  if (transition.attempt === previous && transition.result === undefined) return { round }
  const nextRound = { ...round, words: { ...round.words, [wordKey]: transition.attempt } }
  return transition.result === undefined ? { round: nextRound } : { round: nextRound, result: transition.result }
}

export function serializeMasteryRound(round: MasteryRound): string {
  return JSON.stringify(round)
}

export function deserializeMasteryRound(serialized: string): MasteryRound | undefined {
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!parsed || typeof parsed !== 'object') return undefined
    const candidate = parsed as { id?: unknown; words?: unknown }
    if (typeof candidate.id !== 'string' || !candidate.words || typeof candidate.words !== 'object') return undefined
    const words = Object.fromEntries(Object.entries(candidate.words).filter(([, value]) => isMasteryAttempt(value))) as Record<
      string,
      MasteryAttempt
    >
    return { id: candidate.id, words }
  } catch {
    return undefined
  }
}

function isMasteryAttempt(value: unknown): value is MasteryAttempt {
  return value === 'eligible' || value === 'excluded' || value === 'success' || value === 'failure'
}
