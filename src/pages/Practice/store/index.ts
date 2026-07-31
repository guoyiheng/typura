import type { PracticeSessionState, UserInputLog } from './type'
import type { WordWithIndex } from '@/typings'
import type { LetterMistakes } from '@/utils/db/record'
import '@/utils/db/review-record'
import { mergeLetterMistake } from '@/utils/db/utils'
import shuffle from '@/utils/shuffle'
import { createContext } from 'react'

export const initialPracticeState: PracticeSessionState = {
  chapterData: {
    words: [],
    index: 0,
    wordCount: 0,
    correctCount: 0,
    wrongCount: 0,
    wordRecordIds: [],
    userInputLogs: [],
  },
  timerData: {
    time: 0,
    accuracy: 0,
    wpm: 0,
  },
  isTyping: false,
  isFinished: false,
  isTransVisible: true,
  isLoopSingleWord: false,
  isSavingRecord: false,
}

const initialUserInputLog: UserInputLog = {
  index: 0,
  correctCount: 0,
  wrongCount: 0,
  LetterMistakes: {},
}

export enum PracticeActionType {
  SETUP_CHAPTER = 'SETUP_CHAPTER',
  SET_IS_TYPING = 'SET_IS_TYPING',
  TOGGLE_IS_TYPING = 'TOGGLE_IS_TYPING',
  REPORT_WRONG_WORD = 'REPORT_WRONG_WORD',
  REPORT_CORRECT_WORD = 'REPORT_CORRECT_WORD',
  REPORT_COMPLETED_WORD = 'REPORT_COMPLETED_WORD',
  NEXT_WORD = 'NEXT_WORD',
  LOOP_CURRENT_WORD = 'LOOP_CURRENT_WORD',
  FINISH_CHAPTER = 'FINISH_CHAPTER',
  SKIP_2_WORD_INDEX = 'SKIP_2_WORD_INDEX',
  REPEAT_CHAPTER = 'REPEAT_CHAPTER',
  NEXT_CHAPTER = 'NEXT_CHAPTER',
  TOGGLE_TRANS_VISIBLE = 'TOGGLE_TRANS_VISIBLE',
  TICK_TIMER = 'TICK_TIMER',
  ADD_WORD_RECORD_ID = 'ADD_WORD_RECORD_ID',
  SET_IS_SAVING_RECORD = 'SET_IS_SAVING_RECORD',
  SET_IS_LOOP_SINGLE_WORD = 'SET_IS_LOOP_SINGLE_WORD',
  TOGGLE_IS_LOOP_SINGLE_WORD = 'TOGGLE_IS_LOOP_SINGLE_WORD',
}

export type PracticeAction =
  | { type: PracticeActionType.SETUP_CHAPTER; payload: { words: WordWithIndex[]; shouldShuffle: boolean; initialIndex?: number } }
  | { type: PracticeActionType.SET_IS_TYPING; payload: boolean }
  | { type: PracticeActionType.TOGGLE_IS_TYPING }
  | { type: PracticeActionType.REPORT_WRONG_WORD; payload: { letterMistake: LetterMistakes } }
  | { type: PracticeActionType.REPORT_CORRECT_WORD }
  | { type: PracticeActionType.REPORT_COMPLETED_WORD; payload: { isCorrect: boolean } }
  | { type: PracticeActionType.NEXT_WORD }
  | { type: PracticeActionType.LOOP_CURRENT_WORD }
  | { type: PracticeActionType.FINISH_CHAPTER }
  | { type: PracticeActionType.SKIP_2_WORD_INDEX; newIndex: number }
  | { type: PracticeActionType.REPEAT_CHAPTER; shouldShuffle: boolean }
  | { type: PracticeActionType.NEXT_CHAPTER }
  | { type: PracticeActionType.TOGGLE_TRANS_VISIBLE }
  | { type: PracticeActionType.TICK_TIMER; addTime?: number }
  | { type: PracticeActionType.ADD_WORD_RECORD_ID; payload: number }
  | { type: PracticeActionType.SET_IS_SAVING_RECORD; payload: boolean }
  | { type: PracticeActionType.SET_IS_LOOP_SINGLE_WORD; payload: boolean }
  | { type: PracticeActionType.TOGGLE_IS_LOOP_SINGLE_WORD }

type PracticeDispatch = (action: PracticeAction) => void

export const practiceReducer = (state: PracticeSessionState, action: PracticeAction) => {
  switch (action.type) {
    case PracticeActionType.SETUP_CHAPTER: {
      const newState = structuredClone(initialPracticeState)
      const words = action.payload.shouldShuffle ? shuffle(action.payload.words) : action.payload.words
      let initialIndex = action.payload.initialIndex ?? 0
      if (initialIndex >= words.length) {
        initialIndex = 0
      }
      newState.chapterData.index = initialIndex
      newState.chapterData.words = words
      newState.chapterData.userInputLogs = words.map((_, index) => ({ ...structuredClone(initialUserInputLog), index }))

      return newState
    }
    case PracticeActionType.SET_IS_TYPING:
      state.isTyping = action.payload
      break

    case PracticeActionType.TOGGLE_IS_TYPING:
      state.isTyping = !state.isTyping
      break
    case PracticeActionType.REPORT_CORRECT_WORD: {
      state.chapterData.correctCount += 1

      const wordLog = state.chapterData.userInputLogs[state.chapterData.index]
      wordLog.correctCount += 1
      break
    }
    case PracticeActionType.REPORT_WRONG_WORD: {
      state.chapterData.wrongCount += 1

      const letterMistake = action.payload.letterMistake
      const wordLog = state.chapterData.userInputLogs[state.chapterData.index]
      wordLog.wrongCount += 1
      wordLog.LetterMistakes = mergeLetterMistake(wordLog.LetterMistakes, letterMistake)
      break
    }
    case PracticeActionType.NEXT_WORD: {
      state.chapterData.index += 1
      state.chapterData.wordCount += 1
      break
    }
    case PracticeActionType.LOOP_CURRENT_WORD:
      state.chapterData.wordCount += 1
      break
    case PracticeActionType.FINISH_CHAPTER:
      state.chapterData.wordCount += 1
      state.isTyping = false
      state.isFinished = true
      break
    case PracticeActionType.SKIP_2_WORD_INDEX: {
      const newIndex = action.newIndex
      if (newIndex >= state.chapterData.words.length) {
        state.isTyping = false
        state.isFinished = true
      }
      state.chapterData.index = newIndex
      break
    }
    case PracticeActionType.REPEAT_CHAPTER: {
      const newState = structuredClone(initialPracticeState)
      newState.chapterData.userInputLogs = state.chapterData.words.map((_, index) => ({ ...structuredClone(initialUserInputLog), index }))
      newState.isTyping = true
      newState.chapterData.words = action.shouldShuffle ? shuffle(state.chapterData.words) : state.chapterData.words
      newState.isTransVisible = state.isTransVisible
      return newState
    }
    case PracticeActionType.NEXT_CHAPTER: {
      const newState = structuredClone(initialPracticeState)
      newState.chapterData.userInputLogs = state.chapterData.words.map((_, index) => ({ ...structuredClone(initialUserInputLog), index }))
      newState.isTyping = true
      newState.isTransVisible = state.isTransVisible
      return newState
    }
    case PracticeActionType.TOGGLE_TRANS_VISIBLE:
      state.isTransVisible = !state.isTransVisible
      break
    case PracticeActionType.TICK_TIMER: {
      const increment = action.addTime === undefined ? 1 : action.addTime
      const newTime = state.timerData.time + increment
      const inputSum =
        state.chapterData.correctCount + state.chapterData.wrongCount === 0
          ? 1
          : state.chapterData.correctCount + state.chapterData.wrongCount

      state.timerData.time = newTime
      state.timerData.accuracy = Math.round((state.chapterData.correctCount / inputSum) * 100)
      const effectiveWordCount =
        state.chapterData.correctCount > 0
          ? Math.max(state.chapterData.wordCount, state.chapterData.correctCount / 5)
          : state.chapterData.wordCount
      state.timerData.wpm = newTime > 0 ? Math.round((effectiveWordCount / newTime) * 60) : 0
      break
    }
    case PracticeActionType.ADD_WORD_RECORD_ID: {
      state.chapterData.wordRecordIds.push(action.payload)
      break
    }
    case PracticeActionType.SET_IS_SAVING_RECORD: {
      state.isSavingRecord = action.payload
      break
    }
    case PracticeActionType.SET_IS_LOOP_SINGLE_WORD: {
      state.isLoopSingleWord = action.payload
      break
    }
    case PracticeActionType.TOGGLE_IS_LOOP_SINGLE_WORD: {
      state.isLoopSingleWord = !state.isLoopSingleWord
      break
    }
    default: {
      return state
    }
  }
}

export const PracticeContext = createContext<{ state: PracticeSessionState; dispatch: PracticeDispatch } | null>(null)
