import type { WordMnemonic } from '@/utils/wordExample'
import { getWordMnemonic } from '@/utils/wordExample'
import { useEffect, useMemo, useState } from 'react'

type MnemonicDetailsProps = {
  word: string
  translations: string[]
  showMeaning: boolean
}

function cleanSenseText(value: string) {
  return value
    .replace(/^[（(][^）)]{1,60}[）)]\s*/, '')
    .replace(/(?:\[[^\]]+\]|【[^】]+】)/g, '')
    .replace(/[。；;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function simplifyLocalMeaning(translations: string[]): NonNullable<WordMnemonic['meaning']> {
  const clauses = translations
    .flatMap((translation) => translation.replace(/^(?:n|v|vt|vi|adj|adv)\.\s*/i, '').split(/[；;]/))
    .map((clause) => clause.trim())
    .filter(Boolean)
  const firstSense = (clauses[0] ?? '')
    .split(/[，,、]/)
    .map(cleanSenseText)
    .filter(Boolean)
  const primary = firstSense.slice(0, 2).join('、') || clauses[0] || '理解词义'
  const secondary = [...firstSense.slice(2), ...clauses.slice(1)]
    .map(cleanSenseText)
    .filter((sense, index, values) => sense && sense !== primary && values.indexOf(sense) === index)
    .slice(0, 2)

  return { primary, secondary }
}

export default function MnemonicDetails({ word, translations, showMeaning }: MnemonicDetailsProps) {
  const [mnemonic, setMnemonic] = useState<WordMnemonic | null>(null)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    let isActive = true
    setMnemonic(null)
    setImageFailed(false)

    void getWordMnemonic(word).then((nextMnemonic) => {
      if (isActive) setMnemonic(nextMnemonic)
    })

    return () => {
      isActive = false
    }
  }, [word])

  const meaning = useMemo(() => mnemonic?.meaning ?? simplifyLocalMeaning(translations), [mnemonic?.meaning, translations])
  const imageUrl = imageFailed ? null : mnemonic?.imageUrl
  const hasMemoryCue = Boolean(imageUrl || mnemonic?.rootAnalysis)

  return (
    <div className="mnemonic-details" aria-label={`${word} 助记信息`}>
      <div className="mnemonic-details__meaning" aria-live="polite">
        {showMeaning ? (
          <p>
            <strong>{meaning.primary}</strong>
            {meaning.secondary.length > 0 && <span> · {meaning.secondary.join(' · ')}</span>}
          </p>
        ) : (
          <p aria-hidden="true">&nbsp;</p>
        )}
      </div>

      {hasMemoryCue && (
        <div className="mnemonic-details__memory">
          {imageUrl && (
            <figure className="mnemonic-details__visual">
              <img
                src={imageUrl}
                alt={`与 ${word} 常用义相关的核心画面`}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
              <figcaption>
                核心画面
                {mnemonic?.imageSource && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {mnemonic.imageSourceUrl ? (
                      <a href={mnemonic.imageSourceUrl} target="_blank" rel="noreferrer">
                        {mnemonic.imageSource}
                      </a>
                    ) : (
                      mnemonic.imageSource
                    )}
                  </>
                )}
              </figcaption>
            </figure>
          )}

          {mnemonic?.rootAnalysis && (
            <div className="mnemonic-details__origin">
              <span>词根 / 来源</span>
              <p>{mnemonic.rootAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
