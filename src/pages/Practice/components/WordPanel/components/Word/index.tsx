import type { WordUpdateAction } from '../InputHandler'
import InputHandler from '../InputHandler'
import Letter from './Letter'
import Notation from './Notation'
import { TipAlert } from './TipAlert'
import { initialWordAttempt } from './attemptState'
import type { WordAttemptState } from './attemptState'
import style from './index.module.css'
import { EXPLICIT_SPACE } from '@/constants'
import useKeySounds from '@/hooks/useKeySounds'
import { generateWordSoundSrc } from '@/hooks/usePronunciation'
import { PracticeActionType, PracticeContext } from '@/pages/Practice/store'
import {
  currentChapterAtom,
  currentDictInfoAtom,
  hotkeysConfigAtom,
  isIgnoreCaseAtom,
  isShowAnswerOnHoverAtom,
  isTextSelectableAtom,
  pronunciationConfigAtom,
  restartOnWrongAtom,
  wordDictationConfigAtom,
  wordStatsAtom,
} from '@/store'
import type { Word } from '@/typings'
import { isCharacterMatch } from '@/utils'
import { useSaveWordRecord } from '@/utils/db'
import { useHotkeyAction } from '@/utils/hotkeyBus'
import { formatShortcut, isHotkeyRecorderEvent } from '@/utils/hotkeys'
import { getWordExample } from '@/utils/wordExample'
import type { WordExample } from '@/utils/wordExample'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useImmer } from 'use-immer'

const VOWEL_LETTERS = ['A', 'E', 'I', 'O', 'U']
const COMPLETED_WORD_PREVIEW_DELAY_MS = 500

type WordComponentProps = {
  word: Word
  onFinish: () => void
  onExampleChange: (example: WordExample | null) => void
  onExampleVisibilityChange: (visible: boolean) => void
  onCompletionChange: (isComplete: boolean) => void
  onExamplePlayingChange?: (isPlaying: boolean) => void
  onWordPlayingChange?: (isPlaying: boolean) => void
  stopSelectedPronunciation: () => void
}

function getHeadword(word: Word) {
  try {
    return word.name.replaceAll(' ', EXPLICIT_SPACE).replaceAll('…', '..')
  } catch {
    console.error('word.name is not a string', word)
    return ''
  }
}

function createWordAttempt(word: Word): WordAttemptState {
  const targetText = getHeadword(word)
  const nextAttempt = structuredClone(initialWordAttempt)
  nextAttempt.targetText = targetText
  nextAttempt.characterStates = new Array(targetText.length).fill('normal')
  nextAttempt.randomVisibility = targetText.split('').map(() => Math.random() > 0.4)
  return nextAttempt
}

function getPronunciationText(word: Word, currentLanguage: string) {
  if (currentLanguage !== 'hapin') return word.name
  if (/[\u0400-\u04FF]/.test(word.notation || '')) return word.notation || ''
  return word.trans[2]
}

export default function WordComponent({
  word,
  onFinish,
  onExampleChange,
  onExampleVisibilityChange,
  onCompletionChange,
  onExamplePlayingChange,
  onWordPlayingChange,
  stopSelectedPronunciation,
}: WordComponentProps) {
  const { state, dispatch } = useContext(PracticeContext)!
  const [attempt, updateAttempt] = useImmer<WordAttemptState>(() => createWordAttempt(word))

  const dictationSettings = useAtomValue(wordDictationConfigAtom)
  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const isShowAnswerOnHover = useAtomValue(isShowAnswerOnHoverAtom)
  const saveWordRecord = useSaveWordRecord()
  const [playKeySound, playBeepSound, playHintSound] = useKeySounds()
  const [isHoveringWord, setIsHoveringWord] = useState(false)
  const currentLanguage = useAtomValue(currentDictInfoAtom).language
  const currentLanguageCategory = useAtomValue(currentDictInfoAtom).languageCategory
  const currentChapter = useAtomValue(currentChapterAtom)

  const [showTipAlert, setShowTipAlert] = useState(false)
  const feedbackAnimationRef = useRef<HTMLDivElement>(null)
  const wordAudioRef = useRef<HTMLAudioElement | null>(null)
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)

  const restartAfterMistake = useAtomValue(restartOnWrongAtom)
  const updateWordStats = useSetAtom(wordStatsAtom)
  const keyboardShortcuts = useAtomValue(hotkeysConfigAtom)
  const currentWordIndex = state.chapterData.index
  const [activeExample, setActiveExample] = useState<{ english: string; chinese: string } | null>(null)
  const exampleAudioRef = useRef<HTMLAudioElement | null>(null)
  const exampleRequestRef = useRef<Promise<WordExample | null>>(Promise.resolve(null))
  const completionHandledRef = useRef(false)
  const lastAutoPlayedWordRef = useRef<string | null>(null)
  const previousDictationModeRef = useRef(dictationSettings.isOpen)
  const [revealedThroughIndex, setRevealedThroughIndex] = useState(-1)

  const [isExamplePlaying, setIsExamplePlaying] = useState(false)
  const [isWordAudioPlaying, setIsWordAudioPlaying] = useState(false)

  const stopAutomaticWordPronunciation = useCallback(() => {
    if (wordAudioRef.current && !wordAudioRef.current.paused) {
      wordAudioRef.current.pause()
    }
    setIsWordAudioPlaying(false)
  }, [])

  const playCurrentWordPronunciation = useCallback(() => {
    const url = generateWordSoundSrc(getPronunciationText(word, currentLanguage), pronunciationConfig.type)
    if (!url) return

    stopSelectedPronunciation()
    if (wordAudioRef.current) wordAudioRef.current.pause()

    const audio = new Audio(url)
    wordAudioRef.current = audio
    audio.volume = pronunciationConfig.volume
    audio.playbackRate = pronunciationConfig.rate
    audio.onplay = () => setIsWordAudioPlaying(true)
    audio.onpause = () => setIsWordAudioPlaying(false)
    audio.onended = () => setIsWordAudioPlaying(false)
    audio.onerror = () => setIsWordAudioPlaying(false)
    void audio.play().catch((err) => {
      console.log('Word Audio play error:', err)
      setIsWordAudioPlaying(false)
    })
  }, [
    currentLanguage,
    pronunciationConfig.rate,
    pronunciationConfig.type,
    pronunciationConfig.volume,
    stopSelectedPronunciation,
    word,
  ])

  useHotkeyAction('stopWordPronunciation', stopAutomaticWordPronunciation)

  useEffect(() => {
    onExamplePlayingChange?.(isExamplePlaying)
  }, [isExamplePlaying, onExamplePlayingChange])

  useEffect(() => {
    onWordPlayingChange?.(isWordAudioPlaying)
  }, [isWordAudioPlaying, onWordPlayingChange])

  useEffect(() => {
    // run only when word changes: stop previous audio playback
    if (exampleAudioRef.current) {
      exampleAudioRef.current.pause()
      exampleAudioRef.current = null
    }
    if (wordAudioRef.current) {
      wordAudioRef.current.pause()
      wordAudioRef.current = null
    }
    setIsExamplePlaying(false)
    setIsWordAudioPlaying(false)

    const nextAttempt = createWordAttempt(word)
    completionHandledRef.current = false
    updateAttempt(nextAttempt)
    setRevealedThroughIndex(-1)
  }, [word, updateAttempt])

  const applyInputAction = useCallback(
    (updateAction: WordUpdateAction) => {
      switch (updateAction.type) {
        case 'add': {
          const typedCharacter = updateAction.value === ' ' ? EXPLICIT_SPACE : updateAction.value
          if (updateAction.value === ' ') {
            updateAction.event.preventDefault()
          }

          const characterIndex = attempt.typedText.length
          if (characterIndex >= attempt.targetText.length) return
          if (attempt.hasActiveError && restartAfterMistake) return

          const expectedCharacter = attempt.targetText[characterIndex]
          const matchesExpectedCharacter = isCharacterMatch(typedCharacter, expectedCharacter, isIgnoreCase)

          if (matchesExpectedCharacter) {
            const isComplete = characterIndex + 1 >= attempt.targetText.length
            updateAttempt((draft) => {
              draft.typedText = draft.typedText + typedCharacter
              draft.characterStates[characterIndex] = 'correct'
              draft.keystrokeTimestamps.push(Date.now())
              draft.hasActiveError = false
              draft.isComplete = isComplete
            })
            if (isComplete) playHintSound()
            else playKeySound()
            dispatch({ type: PracticeActionType.REPORT_CORRECT_WORD })
          } else {
            const mistakeCount = attempt.mistakeCount + 1
            const mistakesByPosition = {
              ...attempt.mistakesByPosition,
              [characterIndex]: [...(attempt.mistakesByPosition[characterIndex] ?? []), typedCharacter],
            }

            updateAttempt((draft) => {
              draft.characterStates[characterIndex] = 'wrong'
              draft.hasActiveError = true
              draft.mistakeCount = mistakeCount
              draft.keystrokeTimestamps = []
              draft.mistakesByPosition = mistakesByPosition
            })
            playBeepSound()
            dispatch({
              type: PracticeActionType.REPORT_WRONG_WORD,
              payload: { letterMistake: mistakesByPosition },
            })

            if (currentChapter === 0 && currentWordIndex === 0 && mistakeCount >= 3) {
              setShowTipAlert(true)
            }
          }
          break
        }

        case 'delete':
          updateAttempt((draft) => {
            const currentIndex = draft.typedText.length
            if (draft.characterStates[currentIndex] === 'wrong') {
              draft.characterStates[currentIndex] = 'normal'
              draft.hasActiveError = false
            } else if (currentIndex > 0) {
              const lastIndex = currentIndex - 1
              draft.typedText = draft.typedText.slice(0, -1)
              draft.characterStates[lastIndex] = 'normal'
              draft.hasActiveError = false
              draft.isComplete = false
            }
          })
          break

        default:
          console.warn('unknown update type', updateAction)
      }
    },
    [
      restartAfterMistake,
      isIgnoreCase,
      attempt,
      dispatch,
      currentChapter,
      currentWordIndex,
      updateAttempt,
      playBeepSound,
      playHintSound,
      playKeySound,
    ],
  )

  const handleWordHoverChange = useCallback((checked: boolean) => {
    setIsHoveringWord(checked)
  }, [])

  useHotkeyAction('playPronunciation', playCurrentWordPronunciation)

  const togglePronunciationPlayback = useCallback(() => {
    if (attempt.isComplete && activeExample) {
      if (exampleAudioRef.current && !exampleAudioRef.current.paused) {
        exampleAudioRef.current.pause()
        setIsExamplePlaying(false)
      } else {
        const url = generateWordSoundSrc(activeExample.english, pronunciationConfig.type)
        const audio = exampleAudioRef.current || new Audio(url)
        exampleAudioRef.current = audio
        audio.src = url
        audio.volume = pronunciationConfig.volume
        audio.playbackRate = pronunciationConfig.rate
        audio.onplay = () => setIsExamplePlaying(true)
        audio.onpause = () => setIsExamplePlaying(false)
        audio.onended = () => {
          setIsExamplePlaying(false)
          onFinish()
        }
        audio.onerror = () => {
          setIsExamplePlaying(false)
          onFinish()
        }
        audio.play().catch((err) => {
          console.log('Audio play error:', err)
          setIsExamplePlaying(false)
        })
      }
    } else {
      if (wordAudioRef.current && !wordAudioRef.current.paused) {
        wordAudioRef.current.pause()
        setIsWordAudioPlaying(false)
      } else {
        playCurrentWordPronunciation()
      }
    }
  }, [
    attempt.isComplete,
    activeExample,
    onFinish,
    pronunciationConfig.rate,
    pronunciationConfig.type,
    pronunciationConfig.volume,
    playCurrentWordPronunciation,
  ])

  useHotkeys(
    keyboardShortcuts.playPause || 'ctrl',
    (e) => {
      e.preventDefault()
      togglePronunciationPlayback()
    },
    { enableOnFormTags: true, ignoreEventWhen: isHotkeyRecorderEvent },
    [togglePronunciationPlayback, keyboardShortcuts.playPause],
  )

  useHotkeyAction('playPause', togglePronunciationPlayback)

  const toggleExamplePlayback = useCallback(() => {
    if (!activeExample) return

    const currentAudio = exampleAudioRef.current
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause()
      setIsExamplePlaying(false)
      return
    }

    stopAutomaticWordPronunciation()
    stopSelectedPronunciation()

    const url = generateWordSoundSrc(activeExample.english, pronunciationConfig.type)
    if (!url) return

    const audio = currentAudio || new Audio(url)
    exampleAudioRef.current = audio
    audio.volume = pronunciationConfig.volume
    audio.playbackRate = pronunciationConfig.rate

    if (!currentAudio) {
      audio.onplay = () => setIsExamplePlaying(true)
      audio.onpause = () => setIsExamplePlaying(false)
      audio.onended = () => setIsExamplePlaying(false)
      audio.onerror = () => setIsExamplePlaying(false)
    } else if (audio.ended) {
      audio.currentTime = 0
    }

    void audio.play().catch((err) => {
      console.log('Example audio play error:', err)
      setIsExamplePlaying(false)
    })
  }, [
    activeExample,
    pronunciationConfig.rate,
    pronunciationConfig.type,
    pronunciationConfig.volume,
    stopAutomaticWordPronunciation,
    stopSelectedPronunciation,
  ])

  useHotkeyAction('playExample', toggleExamplePlayback)

  const lastHintRequestAtRef = useRef(0)
  // 拼写提示：每按一次，显示一次当前待输入的字符，重复按向下移动提示指针，200ms内防抖节流以防部分系统CapsLock键keydown和keyup双击触发
  const revealNextCharacter = useCallback(() => {
    const requestedAt = Date.now()
    if (requestedAt - lastHintRequestAtRef.current < 200) {
      return
    }
    lastHintRequestAtRef.current = requestedAt

    setRevealedThroughIndex((previousIndex) => {
      const currentLength = attempt.typedText.length
      if (previousIndex < currentLength) {
        return currentLength
      }
      return previousIndex + 1
    })
  }, [attempt.typedText.length])

  useHotkeys(
    keyboardShortcuts.hint || 'tab',
    (e) => {
      e.preventDefault()
      revealNextCharacter()
    },
    { enableOnFormTags: true, ignoreEventWhen: isHotkeyRecorderEvent },
    [revealNextCharacter, keyboardShortcuts.hint],
  )

  useHotkeyAction('hint', revealNextCharacter)

  useEffect(() => {
    let isEffectActive = true
    const loadExample = async () => {
      setActiveExample(null)
      onExampleChange(null)
      if (currentLanguageCategory !== 'en') {
        exampleRequestRef.current = Promise.resolve(null)
        return
      }
      if (word.name.includes(' ')) {
        const phraseExample = {
          english: word.name,
          chinese: word.trans.join('；'),
        }
        exampleRequestRef.current = Promise.resolve(phraseExample)
        setActiveExample(phraseExample)
        onExampleChange(phraseExample)
        return
      }
      try {
        const examplePromise = getWordExample(word.name)
        exampleRequestRef.current = examplePromise
        const example = await examplePromise
        if (example && isEffectActive) {
          setActiveExample(example)
          onExampleChange(example)
        }
      } catch (e) {
        console.error('Failed to load bilingual sentence', e)
      }
    }
    loadExample()
    return () => {
      isEffectActive = false
      if (exampleAudioRef.current) {
        exampleAudioRef.current.pause()
        exampleAudioRef.current = null
      }
      if (wordAudioRef.current) {
        wordAudioRef.current.pause()
        wordAudioRef.current = null
      }
    }
  }, [currentLanguageCategory, onExampleChange, word])

  useEffect(() => {
    onExampleVisibilityChange(!dictationSettings.isOpen || attempt.isComplete)
  }, [attempt.isComplete, dictationSettings.isOpen, onExampleVisibilityChange])

  useLayoutEffect(() => {
    onCompletionChange(attempt.isComplete)
  }, [attempt.isComplete, onCompletionChange])

  useEffect(() => {
    return () => onExampleVisibilityChange(false)
  }, [onExampleVisibilityChange])

  useEffect(() => {
    if (dictationSettings.isOpen && !previousDictationModeRef.current) {
      lastAutoPlayedWordRef.current = null
    }
    previousDictationModeRef.current = dictationSettings.isOpen
  }, [dictationSettings.isOpen])

  // Run after the word-reset effect above has stopped audio from the previous word.
  useEffect(() => {
    const isDictation = dictationSettings.isOpen
    const shouldReadBefore = isDictation
      ? (dictationSettings.isReadBefore ?? true)
      : (dictationSettings.isLearnReadBefore ?? dictationSettings.isReadBefore ?? true)

    if (!shouldReadBefore || attempt.typedText.length !== 0 || attempt.isComplete) return

    const wordKey = `${currentWordIndex}:${word.name}`
    if (lastAutoPlayedWordRef.current === wordKey) return

    const pronunciationText = getPronunciationText(word, currentLanguage)
    const url = generateWordSoundSrc(pronunciationText, pronunciationConfig.type)
    if (!url) return

    let isEffectActive = true
    if (wordAudioRef.current) {
      wordAudioRef.current.pause()
    }

    const audio = new Audio(url)
    wordAudioRef.current = audio
    audio.volume = pronunciationConfig.volume
    audio.playbackRate = pronunciationConfig.rate
    audio.onplay = () => {
      if (!isEffectActive) return
      lastAutoPlayedWordRef.current = wordKey
      setIsWordAudioPlaying(true)
    }
    audio.onpause = () => {
      if (isEffectActive) setIsWordAudioPlaying(false)
    }
    audio.onended = () => {
      if (isEffectActive) setIsWordAudioPlaying(false)
    }
    audio.onerror = () => {
      if (isEffectActive) setIsWordAudioPlaying(false)
    }
    audio.play().catch((err) => {
      if (isEffectActive) {
        console.log('Auto play word sound error:', err)
      }
    })

    return () => {
      isEffectActive = false
    }
  }, [
    currentWordIndex,
    word,
    currentLanguage,
    dictationSettings.isOpen,
    dictationSettings.isReadBefore,
    dictationSettings.isLearnReadBefore,
    attempt.typedText.length,
    attempt.isComplete,
    pronunciationConfig.type,
    pronunciationConfig.volume,
    pronunciationConfig.rate,
  ])

  const isCharacterVisible = useCallback(
    (index: number) => {
      if (attempt.characterStates[index] === 'correct' || (isShowAnswerOnHover && isHoveringWord)) return true

      if (index >= attempt.typedText.length && index <= revealedThroughIndex) {
        return true
      }

      if (dictationSettings.isOpen) {
        if (dictationSettings.type === 'hideAll') return false

        const letter = attempt.targetText[index]
        if (dictationSettings.type === 'hideVowel') {
          return VOWEL_LETTERS.includes(letter.toUpperCase()) ? false : true
        }
        if (dictationSettings.type === 'hideConsonant') {
          return VOWEL_LETTERS.includes(letter.toUpperCase()) ? true : false
        }
        if (dictationSettings.type === 'randomHide') {
          return attempt.randomVisibility[index]
        }
      }
      return true
    },
    [
      isHoveringWord,
      isShowAnswerOnHover,
      revealedThroughIndex,
      dictationSettings.isOpen,
      dictationSettings.type,
      attempt.targetText,
      attempt.typedText.length,
      attempt.characterStates,
      attempt.randomVisibility,
    ],
  )

  useEffect(() => {
    if (attempt.hasActiveError && restartAfterMistake) {
      const timer = setTimeout(() => {
        updateAttempt((draft) => {
          draft.typedText = ''
          draft.characterStates = new Array(draft.characterStates.length).fill('normal')
          draft.hasActiveError = false
        })
      }, 300)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [attempt.hasActiveError, restartAfterMistake, updateAttempt])

  useLayoutEffect(() => {
    if (attempt.mistakeCount === 0) return
    const el = feedbackAnimationRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = ''
  }, [attempt.mistakeCount])

  useEffect(() => {
    if (attempt.isComplete && !completionHandledRef.current) {
      completionHandledRef.current = true

      let isEffectActive = true
      let hasCompletedTransition = false
      let hasStartedExamplePlayback = false
      let completionTimer: number | undefined

      const completeWordFlow = () => {
        if (!isEffectActive || hasCompletedTransition) return
        hasCompletedTransition = true
        onFinish()
      }

      dispatch({
        type: PracticeActionType.REPORT_COMPLETED_WORD,
        payload: { isCorrect: attempt.mistakeCount === 0 },
      })
      dispatch({ type: PracticeActionType.SET_IS_SAVING_RECORD, payload: true })

      saveWordRecord({
        word: word.name,
        wrongCount: attempt.mistakeCount,
        letterTimeArray: attempt.keystrokeTimestamps,
        letterMistake: attempt.mistakesByPosition,
      })

      updateWordStats((previousStats) => {
        const existingStats = previousStats[word.name] || {
          correctStreak: 0,
          status: 'normal',
          learnCount: 0,
          dictationCount: 0,
          successCount: 0,
          failCount: 0,
        }
        let nextCorrectStreak = existingStats.correctStreak
        let nextStatus = existingStats.status

        const previousLearnCount = existingStats.learnCount ?? 0
        const previousDictationCount = existingStats.dictationCount ?? 0
        const previousSuccessCount = existingStats.successCount ?? 0
        const previousFailCount = existingStats.failCount ?? 0

        const nextLearnCount = dictationSettings.isOpen ? previousLearnCount : previousLearnCount + 1
        const nextDictationCount = dictationSettings.isOpen ? previousDictationCount + 1 : previousDictationCount
        const nextSuccessCount = attempt.mistakeCount === 0 ? previousSuccessCount + 1 : previousSuccessCount
        const nextFailCount = attempt.mistakeCount > 0 ? previousFailCount + 1 : previousFailCount

        const usedHint = revealedThroughIndex >= 0

        if (usedHint || attempt.mistakeCount >= 5) {
          nextStatus = 'forgotten'
          nextCorrectStreak = 0
        } else if (attempt.mistakeCount >= 3) {
          nextStatus = 'blurry'
          nextCorrectStreak = 0
        } else if (attempt.mistakeCount === 0) {
          nextStatus = 'familiar'
          nextCorrectStreak = 1
        } else {
          nextStatus = 'normal'
          nextCorrectStreak = 0
        }

        return {
          ...previousStats,
          [word.name]: {
            correctStreak: nextCorrectStreak,
            status: nextStatus,
            learnCount: nextLearnCount,
            dictationCount: nextDictationCount,
            successCount: nextSuccessCount,
            failCount: nextFailCount,
          },
        }
      })

      const playExampleAudio = async () => {
        const example = activeExample ?? (await exampleRequestRef.current)
        if (!isEffectActive) return

        if (example) {
          if (exampleAudioRef.current) {
            exampleAudioRef.current.pause()
          }
          const url = generateWordSoundSrc(example.english, pronunciationConfig.type)
          const audio = new Audio(url)
          exampleAudioRef.current = audio
          audio.volume = pronunciationConfig.volume
          audio.playbackRate = pronunciationConfig.rate

          const cleanup = () => {
            if (isEffectActive) setIsExamplePlaying(false)
          }

          audio.onplay = () => {
            if (isEffectActive) setIsExamplePlaying(true)
          }
          audio.onpause = cleanup
          audio.onended = () => {
            cleanup()
            completeWordFlow()
          }
          audio.onerror = () => {
            cleanup()
            completeWordFlow()
          }

          audio.play().catch((err) => {
            console.log('Sentence Audio play error:', err)
            cleanup()
            completeWordFlow()
          })
        } else {
          completeWordFlow()
        }
      }

      const continueToExample = () => {
        if (hasStartedExamplePlayback) return
        hasStartedExamplePlayback = true
        void playExampleAudio()
      }

      const playCompletedWord = () => {
        const pronunciationText = getPronunciationText(word, currentLanguage)
        const wordSoundUrl = generateWordSoundSrc(pronunciationText, pronunciationConfig.type)
        if (wordSoundUrl) {
          if (wordAudioRef.current) {
            wordAudioRef.current.pause()
          }
          const wordAudio = new Audio(wordSoundUrl)
          wordAudioRef.current = wordAudio
          wordAudio.volume = pronunciationConfig.volume
          wordAudio.playbackRate = pronunciationConfig.rate

          const cleanup = () => {
            if (isEffectActive) setIsWordAudioPlaying(false)
          }

          wordAudio.onplay = () => {
            if (isEffectActive) setIsWordAudioPlaying(true)
          }
          wordAudio.onpause = cleanup
          wordAudio.onended = () => {
            cleanup()
            continueToExample()
          }
          wordAudio.onerror = () => {
            cleanup()
            continueToExample()
          }

          wordAudio.play().catch((err) => {
            console.log('Word Audio play error:', err)
            cleanup()
            continueToExample()
          })
        } else {
          continueToExample()
        }
      }

      const isDictation = dictationSettings.isOpen
      const shouldReadBefore = isDictation
        ? (dictationSettings.isReadBefore ?? true)
        : (dictationSettings.isLearnReadBefore ?? dictationSettings.isReadBefore ?? true)
      const shouldReadAfter = isDictation
        ? (dictationSettings.isReadAfter ?? true)
        : (dictationSettings.isLearnReadAfter ?? dictationSettings.isReadAfter ?? true)

      if (shouldReadAfter) {
        playCompletedWord()
      } else if (!shouldReadBefore) {
        completionTimer = window.setTimeout(completeWordFlow, COMPLETED_WORD_PREVIEW_DELAY_MS)
      } else {
        completeWordFlow()
      }

      return () => {
        isEffectActive = false
        if (completionTimer !== undefined) window.clearTimeout(completionTimer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.isComplete, updateWordStats])

  return (
    <>
      <InputHandler updateInput={applyInputAction} />
      <div
        lang={currentLanguageCategory !== 'code' ? currentLanguageCategory : 'en'}
        className="flex flex-col items-center justify-center pt-4 pb-1"
      >
        {['romaji', 'hapin'].includes(currentLanguage) && word.notation && <Notation notation={word.notation} />}
        <div
          className="tooltip-info relative w-fit border-0 bg-transparent p-0 leading-normal shadow-none outline-none dark:bg-transparent"
          data-tip={`按 ${formatShortcut(keyboardShortcuts.hint)} 快捷键显示完整单词`}
        >
          <div
            ref={feedbackAnimationRef}
            onMouseEnter={() => handleWordHoverChange(true)}
            onMouseLeave={() => handleWordHoverChange(false)}
            className={`flex items-center ${isTextSelectable && 'select-all'} justify-center ${attempt.hasActiveError ? style.wrong : ''}`}
          >
            {attempt.targetText.split('').map((character, index) => {
              return (
                <Letter
                  key={`${index}-${character}`}
                  letter={character}
                  visible={isCharacterVisible(index)}
                  state={attempt.characterStates[index]}
                />
              )
            })}
          </div>
        </div>
      </div>

      <TipAlert
        className="fixed top-24 left-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2"
        show={showTipAlert}
        setShow={setShowTipAlert}
      />
    </>
  )
}
