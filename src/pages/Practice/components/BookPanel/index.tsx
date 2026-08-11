import type { WordUpdateAction } from '../WordPanel/components/InputHandler'
import InputHandler from '../WordPanel/components/InputHandler'
import { BookWordDialog } from './BookWordDialog'
import useKeySounds from '@/hooks/useKeySounds'
import { PracticeActionType, PracticeContext } from '@/pages/Practice/store'
import { bookFontSizeConfigAtom, currentChapterAtom, currentChapterInfoAtom, isIgnoreCaseAtom, isZenModeAtom } from '@/store'
import type { Word } from '@/typings'
import { isCharacterMatch } from '@/utils'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function BookPanel() {
  const { state, dispatch } = useContext(PracticeContext)!
  const fontSize = useAtomValue(bookFontSizeConfigAtom).size
  const chapterInfo = useAtomValue(currentChapterInfoAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const isZenMode = useAtomValue(isZenModeAtom)
  const [playKeySound, playWrongSound, playCorrectSound] = useKeySounds()
  const [typedText, setTypedText] = useState('')
  const [hasActiveError, setHasActiveError] = useState(false)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const activeWordRef = useRef<HTMLButtonElement | null>(null)
  const errorTimerRef = useRef<number | null>(null)
  const mistakeCountRef = useRef(0)
  const completionLockRef = useRef(false)
  const resumeTypingRef = useRef(false)
  const activeWord = state.chapterData.words[state.chapterData.index]

  useEffect(() => {
    setTypedText('')
    setHasActiveError(false)
    mistakeCountRef.current = 0
    completionLockRef.current = false
  }, [state.chapterData.index])

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    activeWordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  }, [state.chapterData.index])

  const reportMistake = useCallback(
    (typedCharacter: string, expectedCharacter: string, characterIndex: number) => {
      mistakeCountRef.current += 1
      setHasActiveError(true)
      playWrongSound()
      dispatch({
        type: PracticeActionType.REPORT_WRONG_WORD,
        payload: { letterMistake: { [characterIndex]: [typedCharacter || `missing:${expectedCharacter}`] } },
      })
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
      errorTimerRef.current = window.setTimeout(() => setHasActiveError(false), 180)
    },
    [dispatch, playWrongSound],
  )

  const completeWord = useCallback(() => {
    if (completionLockRef.current || !activeWord) return
    completionLockRef.current = true
    playCorrectSound()
    dispatch({
      type: PracticeActionType.REPORT_COMPLETED_WORD,
      payload: { isCorrect: mistakeCountRef.current === 0 },
    })

    if (state.chapterData.index >= state.chapterData.words.length - 1) {
      dispatch({ type: PracticeActionType.FINISH_CHAPTER })
    } else {
      dispatch({ type: PracticeActionType.NEXT_WORD })
    }
  }, [activeWord, dispatch, playCorrectSound, state.chapterData.index, state.chapterData.words.length])

  const updateInput = useCallback(
    (action: WordUpdateAction) => {
      if (!activeWord || completionLockRef.current) return
      const target = activeWord.name

      if (action.type === 'delete') {
        setTypedText((current) => current.slice(0, Math.max(0, current.length - action.length)))
        return
      }

      if (action.type !== 'add') return
      if (action.value === ' ') {
        action.event.preventDefault()
        if (typedText.length === target.length) {
          completeWord()
        } else {
          reportMistake('space', target[typedText.length] ?? '', typedText.length)
        }
        return
      }

      const characterIndex = typedText.length
      const expectedCharacter = target[characterIndex]
      if (!expectedCharacter) {
        reportMistake(action.value, 'space', characterIndex)
        return
      }

      if (isCharacterMatch(action.value, expectedCharacter, isIgnoreCase)) {
        const nextTypedText = typedText + action.value
        setTypedText(nextTypedText)
        playKeySound()
        dispatch({ type: PracticeActionType.REPORT_CORRECT_WORD })

        if (nextTypedText.length === target.length && state.chapterData.index === state.chapterData.words.length - 1) {
          window.setTimeout(completeWord, 0)
        }
      } else {
        reportMistake(action.value, expectedCharacter, characterIndex)
      }
    },
    [
      activeWord,
      completeWord,
      dispatch,
      isIgnoreCase,
      playKeySound,
      reportMistake,
      state.chapterData.index,
      state.chapterData.words.length,
      typedText,
    ],
  )

  const openWord = (word: Word) => {
    resumeTypingRef.current = state.isTyping
    dispatch({ type: PracticeActionType.SET_IS_TYPING, payload: false })
    setSelectedWord(word)
  }

  const closeWord = () => {
    setSelectedWord(null)
    if (resumeTypingRef.current) {
      dispatch({ type: PracticeActionType.SET_IS_TYPING, payload: true })
    }
    resumeTypingRef.current = false
  }

  return (
    <div className={`book-practice ${isZenMode ? 'book-practice--zen' : ''}`}>
      <InputHandler updateInput={updateInput} />
      {!state.isTyping && (
        <div className="practice-start-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="practice-start-prompt text-center text-xl font-medium select-none">
            按任意键{state.timerData.time ? '继续' : '开始'}
          </p>
        </div>
      )}

      <header className="book-practice__header">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-[var(--primary)]">CHAPTER {String(currentChapter + 1).padStart(2, '0')}</p>
          <h2 className="font-display mt-1 truncate text-xl font-semibold text-[var(--ink)]">{chapterInfo?.name}</h2>
        </div>
        <span className="shrink-0 text-xs font-medium text-[var(--muted)] tabular-nums">
          {Math.min(state.chapterData.index + 1, state.chapterData.words.length)} / {state.chapterData.words.length}
        </span>
      </header>

      <div className="customized-scrollbar book-practice__scroll" style={{ fontSize: `${fontSize}px` }}>
        <div className="book-practice__text" lang="en">
          {state.chapterData.words.map((word, index) => {
            const isActive = index === state.chapterData.index
            const isComplete = index < state.chapterData.index
            const hasMistake = state.chapterData.userInputLogs[index]?.wrongCount > 0

            return (
              <span key={`${word.index}-${index}-${word.name}`}>
                {word.paragraphStart && index > 0 && <span className="book-practice__paragraph-break" aria-hidden="true" />}
                <button
                  type="button"
                  ref={isActive ? activeWordRef : undefined}
                  onClick={() => openWord(word)}
                  className={`book-practice__word ${isActive ? 'book-practice__word--active' : ''} ${
                    isComplete ? 'book-practice__word--complete' : ''
                  } ${hasMistake && isComplete ? 'book-practice__word--mistake' : ''} ${hasActiveError && isActive ? 'book-practice__word--error' : ''}`}
                  aria-label={`查看单词 ${word.lookup || word.name}`}
                >
                  {isActive
                    ? word.name.split('').map((character, characterIndex) => (
                        <span
                          key={`${character}-${characterIndex}`}
                          className={characterIndex < typedText.length ? 'book-practice__character--typed' : 'book-practice__character'}
                        >
                          {character}
                        </span>
                      ))
                    : word.name}
                  {isActive && typedText.length === word.name.length && <span className="book-practice__caret" aria-hidden="true" />}
                </button>{' '}
              </span>
            )
          })}
        </div>
      </div>

      <BookWordDialog word={selectedWord} onClose={closeWord} />
    </div>
  )
}
