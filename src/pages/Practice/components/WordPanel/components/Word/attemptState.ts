import type { LetterState } from './Letter'
import type { LetterMistakes } from '@/utils/db/record'

export type WordAttemptState = {
  targetText: string
  typedText: string
  characterStates: LetterState[]
  isComplete: boolean
  hasActiveError: boolean
  mistakeCount: number
  keystrokeTimestamps: number[]
  mistakesByPosition: LetterMistakes
  randomVisibility: boolean[]
}

export const initialWordAttempt: WordAttemptState = {
  targetText: '',
  typedText: '',
  characterStates: [],
  isComplete: false,
  hasActiveError: false,
  mistakeCount: 0,
  keystrokeTimestamps: [],
  mistakesByPosition: {},
  randomVisibility: [],
}
