import type { WordPronunciationIconRef } from '@/components/WordPronunciationIcon'
import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { PracticeActionType, PracticeContext } from '@/pages/Practice/store'
import { currentDictInfoAtom, wordDictationConfigAtom, wordStatsAtom } from '@/store'
import type { Word, WordDictationType } from '@/typings'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { forwardRef, useCallback, useContext, useMemo, useRef } from 'react'

interface WordCardProps {
  word: Word
  isActive: boolean
  isLearned: boolean
  isCurrent: boolean
  isUnlearned: boolean
  isHovered: boolean
  index: number
}

function isCharHidden(char: string, index: number, dictationType: WordDictationType): boolean {
  if (dictationType === 'hideAll') return true
  const upper = char.toUpperCase()
  const isVowel = vowelLetters.includes(upper)
  if (dictationType === 'hideVowel') return isVowel
  if (dictationType === 'hideConsonant') return /[A-Z]/.test(upper) && !isVowel
  if (dictationType === 'randomHide') return index % 2 === 1
  return true
}

const vowelLetters = ['A', 'E', 'I', 'O', 'U']

const WordCard = forwardRef<HTMLDivElement, WordCardProps>(({ word, isActive, isLearned, isHovered, index }, ref) => {
  const wordPronunciationIconRef = useRef<WordPronunciationIconRef>(null)
  const currentLanguage = useAtomValue(currentDictInfoAtom).language
  const wordStats = useAtomValue(wordStatsAtom)
  const wordDictationConfig = useAtomValue(wordDictationConfigAtom)
  const { state, dispatch } = useContext(PracticeContext)!

  const isTransVisible = state?.isTransVisible ?? true
  const isDictationMode = wordDictationConfig?.isOpen ?? false

  const status = useMemo(() => {
    return wordStats[word.name]?.status ?? 'normal'
  }, [wordStats, word.name])

  const statusColorClass = useMemo(() => {
    if (status === 'forgotten') return 'text-[var(--danger)] opacity-75'
    if (status === 'blurry') return 'text-[var(--warning)] opacity-75'
    if (status === 'familiar') return 'text-[var(--success)] opacity-75'
    return 'text-[var(--ink)]'
  }, [status])

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    wordPronunciationIconRef.current?.play()
  }, [])

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (dispatch) {
        dispatch({ type: PracticeActionType.SKIP_2_WORD_INDEX, newIndex: index })
      }
      handlePlay(e)
    },
    [dispatch, index, handlePlay],
  )

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
      e.preventDefault()
      e.stopPropagation()
      dispatch?.({ type: PracticeActionType.SKIP_2_WORD_INDEX, newIndex: index })
      wordPronunciationIconRef.current?.play()
    },
    [dispatch, index],
  )

  const wordText = (['romaji', 'hapin'].includes(currentLanguage) ? word.notation : word.name) || ''
  const transText = word.trans ? word.trans.join('；') : ''

  // 已默写完的 (isLearned) 不再遮挡；未默写完的在开默写模式且非 hover 时触发单词隐藏逻辑
  const isDictationActive = !isHovered && !isLearned && isDictationMode

  // 含义是否显示根据 「是否显示含义」 调整
  const isTransMasked = useMemo(() => {
    if (isHovered) return false
    if (!isTransVisible) return true
    return false
  }, [isHovered, isTransVisible])

  // 当前单词只需要淡淡的背景色，不要边框颜色
  const statusBgClass = useMemo(() => {
    if (isActive) {
      return 'border-transparent bg-[var(--surface-soft)] font-medium'
    }
    return 'border-transparent bg-transparent hover:bg-[var(--surface-soft)]'
  }, [isActive])

  // 单词文本按字符动态渲染完整或不完整
  const renderedWordText = useMemo(() => {
    if (!isDictationActive) {
      return <span>{wordText}</span>
    }

    const dictationType = wordDictationConfig?.type || 'hideAll'
    return (
      <span>
        {wordText.split('').map((ch, idx) => {
          const hidden = isCharHidden(ch, idx, dictationType)
          if (hidden) {
            return (
              <span key={idx} className="inline-block px-[0.5px] opacity-40 blur-[4px] filter select-none">
                {ch}
              </span>
            )
          }
          return (
            <span key={idx} className="blur-0 opacity-100">
              {ch}
            </span>
          )
        })}
      </span>
    )
  }, [isDictationActive, wordText, wordDictationConfig?.type])

  return (
    <div
      ref={ref}
      className={`group relative flex h-[48px] shrink-0 items-center justify-between rounded-md border px-2.5 py-1.5 transition-colors duration-150 select-none ${statusBgClass}`}
    >
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm"
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
        aria-current={isActive ? 'true' : undefined}
        aria-label={`跳转到第 ${index + 1} 个单词：${wordText}`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-semibold text-[var(--body)] tabular-nums">
          {index + 1}
        </span>

        <div className="flex min-w-0 flex-col justify-center">
          <div className={`truncate font-mono text-sm font-semibold transition-all duration-300 ${statusColorClass}`}>
            {renderedWordText}
          </div>
          {transText && (
            <div
              className={`truncate font-sans text-xs text-[var(--muted)] transition-all duration-300 ${
                isTransMasked ? 'opacity-30 blur-[4px] filter select-none' : 'blur-0 opacity-100'
              }`}
            >
              {transText}
            </div>
          )}
        </div>
      </div>

      <div
        className={`ml-2 shrink-0 transition-opacity duration-200 ${
          isDictationActive && isTransMasked ? 'opacity-20' : 'opacity-40 group-hover:opacity-70'
        }`}
      >
        <WordPronunciationIcon
          word={word}
          lang={currentLanguage}
          className="h-4 w-4 cursor-pointer text-[var(--muted)]"
          ref={wordPronunciationIconRef}
        />
      </div>
    </div>
  )
})

WordCard.displayName = 'WordCard'

export default WordCard
