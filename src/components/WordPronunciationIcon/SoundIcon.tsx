import type { LucideIcon } from 'lucide-react'
import { Volume, Volume1, Volume2 } from 'lucide-react'
import type { MouseEventHandler } from 'react'
import { useCallback, useEffect, useState } from 'react'

const volumeFrames: LucideIcon[] = [Volume, Volume1, Volume2]

export const SoundIcon = ({ duration = 500, animated = false, onClick, iconClassName, className, ariaLabel = '播放发音' }: SoundIconProps) => {
  const [animationFrameIndex, setAnimationFrameIndex] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const index = animated ? (animationFrameIndex < volumeFrames.length - 1 ? animationFrameIndex + 1 : 0) : 0

      setAnimationFrameIndex(index)
    }, duration)

    return () => {
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, animationFrameIndex])

  const Icon = volumeFrames[animationFrameIndex]
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      onClick?.(event)

      if (event.detail > 0) {
        event.currentTarget.blur()
      }
    },
    [onClick],
  )

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center text-[var(--muted)] transition-colors hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] focus-visible:outline-none ${
        className ?? ''
      }`}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      <Icon className={iconClassName ?? 'h-full w-full'} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}

export type SoundIconProps = {
  animated?: boolean
  duration?: number
  onClick?: MouseEventHandler<HTMLButtonElement>
  iconClassName?: string
  className?: string
  ariaLabel?: string
}
