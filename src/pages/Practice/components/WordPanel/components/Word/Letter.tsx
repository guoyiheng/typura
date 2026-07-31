import { EXPLICIT_SPACE } from '@/constants'
import { fontSizeConfigAtom } from '@/store'
import { useAtomValue } from 'jotai'
import React from 'react'

export type LetterState = 'normal' | 'correct' | 'wrong'

const letterStateStyles: Record<'space' | 'standard', Record<LetterState, string>> = {
  space: {
    normal: 'text-[var(--muted)] opacity-55',
    correct: 'text-[var(--success)] opacity-60',
    wrong: 'text-[var(--danger)] opacity-70',
  },
  standard: {
    normal: 'text-[var(--ink)]',
    correct: 'text-[var(--success)]',
    wrong: 'text-[var(--danger)]',
  },
}

type LetterProps = {
  letter: string
  state?: LetterState
  visible?: boolean
}

const Letter: React.FC<LetterProps> = ({ letter, state = 'normal', visible = true }) => {
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)
  const isSpace = letter === EXPLICIT_SPACE

  if (isSpace) {
    return (
      <span
        className="inline-block"
        style={{ fontSize: fontSizeConfig.foreignFont.toString() + 'px', width: '0.45em' }}
      />
    )
  }

  // 填词下划线 (Fill-in-the-blanks style)
  const underlineBorderClass = visible
    ? state === 'correct'
      ? 'border-[var(--success)]'
      : state === 'wrong'
        ? 'border-[var(--danger)]'
        : 'border-[var(--line-strong)]'
    : 'border-[var(--line-strong)] opacity-60'

  return (
    <span
      className={`inline-flex items-center justify-center mx-[2px] border-b-2 pb-[1px] font-mono font-normal transition-colors select-none ${underlineBorderClass}`}
      style={{
        fontSize: fontSizeConfig.foreignFont.toString() + 'px',
        minWidth: '0.58em',
      }}
    >
      <span className={visible ? letterStateStyles.standard[state] : 'invisible'}>{letter}</span>
    </span>
  )
}

export default React.memo(Letter)
