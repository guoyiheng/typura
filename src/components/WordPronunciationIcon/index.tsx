import { SoundIcon } from './SoundIcon'
import usePronunciationSound from '@/hooks/usePronunciation'
import type { PronunciationType, Word } from '@/typings'
import { useCallback, useEffect, useImperativeHandle } from 'react'
import React from 'react'

export const WordPronunciationIcon = React.forwardRef<
  WordPronunciationIconRef,
  {
    word: Word
    lang: string
    pronunciationType?: PronunciationType
    className?: string
    iconClassName?: string
    isPlaying?: boolean
    onClick?: () => void
    ariaLabel?: string
  }
>(({ word, lang, pronunciationType, className, iconClassName, isPlaying: externalIsPlaying, onClick, ariaLabel }, ref) => {
  const currentWord = () => {
    if (lang === 'hapin') {
      if (/[\u0400-\u04FF]/.test(word.notation || '')) {
        // 哈萨克语西里尔文字
        return word.notation || ''
      } else {
        // 哈萨克语老文字
        return word.trans[2]
      }
    } else {
      return word.name
    }
  }
  const { play, stop, isPlaying: internalIsPlaying } = usePronunciationSound(currentWord(), undefined, pronunciationType)

  const isPlaying = Boolean(externalIsPlaying || internalIsPlaying)

  const playSound = useCallback(() => {
    stop()
    play()
  }, [play, stop])

  useEffect(() => {
    return stop
  }, [word, stop])

  useImperativeHandle(
    ref,
    () => ({
      play: playSound,
      stop: stop,
      isPlaying: isPlaying,
    }),
    [playSound, stop, isPlaying],
  )

  return (
    <SoundIcon
      animated={isPlaying}
      onClick={onClick ?? playSound}
      className={`cursor-pointer ${className ?? ''}`}
      iconClassName={iconClassName}
      ariaLabel={ariaLabel}
    />
  )
})

WordPronunciationIcon.displayName = 'WordPronunciationIcon'

export type WordPronunciationIconRef = {
  play: () => void
  stop: () => void
  isPlaying: boolean
}
