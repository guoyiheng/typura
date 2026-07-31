import Tooltip from '@/components/Tooltip'
import { SoundIcon } from '@/components/WordPronunciationIcon/SoundIcon'
import useSpeech from '@/hooks/useSpeech'
import { fontSizeConfigAtom, isTextSelectableAtom, pronunciationConfigAtom } from '@/store'
import { formatTransByPOS } from '@/utils'
import { useAtomValue } from 'jotai'
import { useCallback, useMemo } from 'react'

export type TranslationProps = {
  trans: string | string[]
  showTrans?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function Translation({ trans, showTrans = true, onMouseEnter, onMouseLeave }: TranslationProps) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)
  const isShowTransRead = window.speechSynthesis && pronunciationConfig.isTransRead

  const lines = useMemo(() => {
    return formatTransByPOS(trans)
  }, [trans])

  const fullTransText = useMemo(() => {
    return lines.join('；')
  }, [lines])

  const speechOptions = useMemo(() => ({ volume: pronunciationConfig.transVolume }), [pronunciationConfig.transVolume])
  const { speak, speaking } = useSpeech(fullTransText, speechOptions)

  const handleClickSoundIcon = useCallback(() => {
    speak(true)
  }, [speak])

  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  return (
    <div className={`flex items-center justify-center pt-5 pb-4`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div
        className={`flex max-w-xl flex-col items-center gap-1.5 text-center font-sans leading-relaxed break-words whitespace-normal text-[var(--body)] transition-colors duration-300 md:max-w-2xl ${
          isShowTransRead && 'pl-8'
        } ${isTextSelectable && 'select-text'}`}
        style={{ fontSize: fontSizeConfig.translateFont.toString() + 'px' }}
      >
        {showTrans ? (
          lines.map((line, index) => (
            <div key={`${index}-${line}`} className="w-full text-center">
              {line}
            </div>
          ))
        ) : (
          <div>{'\u00A0'}</div>
        )}
      </div>
      {isShowTransRead && showTrans && (
        <Tooltip content="朗读释义" className="ml-3 h-5 w-5 shrink-0 cursor-pointer leading-7">
          <SoundIcon animated={speaking} onClick={handleClickSoundIcon} className="h-5 w-5" />
        </Tooltip>
      )}
    </div>
  )
}
