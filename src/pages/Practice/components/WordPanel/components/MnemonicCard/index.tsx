import type { WordExample, WordMnemonic } from '@/utils/wordExample'
import { getWordExample, getWordMnemonic } from '@/utils/wordExample'
import { useEffect, useMemo, useState } from 'react'

type MnemonicCardProps = {
  word: string
  translations: string[]
  example: WordExample | null
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

function ContextSentence({ sentence, word }: { sentence: string; word: string }) {
  const matchIndex = sentence.toLocaleLowerCase().indexOf(word.toLocaleLowerCase())
  if (matchIndex < 0) return <>{sentence}</>

  return (
    <>
      {sentence.slice(0, matchIndex)}
      <strong>{sentence.slice(matchIndex, matchIndex + word.length)}</strong>
      {sentence.slice(matchIndex + word.length)}
    </>
  )
}

export default function MnemonicCard({ word, translations, example }: MnemonicCardProps) {
  const [mnemonic, setMnemonic] = useState<WordMnemonic | null>(null)
  const [loadedExample, setLoadedExample] = useState<WordExample | null>(null)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    let isActive = true
    setMnemonic(null)
    setLoadedExample(null)
    setImageFailed(false)

    void Promise.all([getWordMnemonic(word), getWordExample(word)]).then(([nextMnemonic, nextExample]) => {
      if (!isActive) return
      setMnemonic(nextMnemonic)
      setLoadedExample(nextExample)
    })

    return () => {
      isActive = false
    }
  }, [word])

  const meaning = useMemo(() => mnemonic?.meaning ?? simplifyLocalMeaning(translations), [mnemonic?.meaning, translations])
  const context = example ?? loadedExample
  const imageUrl = imageFailed ? null : mnemonic?.imageUrl

  return (
    <aside className="mnemonic-card" aria-label={`${word} 助记卡`}>
      <figure className="mnemonic-card__visual">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`与 ${word} 常用义相关的核心画面`}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="mnemonic-card__visual-fallback">
            <span>核心画面</span>
            <strong>{meaning.primary}</strong>
          </div>
        )}
        {imageUrl && (
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
        )}
      </figure>

      <div className="mnemonic-card__content">
        <section className="mnemonic-card__section mnemonic-card__meaning">
          <span className="mnemonic-card__label">常用义</span>
          <p>
            <strong>{meaning.primary}</strong>
            {meaning.secondary.length > 0 && <span> · {meaning.secondary.join(' · ')}</span>}
          </p>
        </section>

        {mnemonic?.rootAnalysis && (
          <section className="mnemonic-card__section">
            <span className="mnemonic-card__label">词根 / 来源</span>
            <p>{mnemonic.rootAnalysis}</p>
          </section>
        )}

        {context && (
          <section className="mnemonic-card__section mnemonic-card__context">
            <span className="mnemonic-card__label">一句语境</span>
            <p lang="en">
              <ContextSentence sentence={context.english} word={word} />
            </p>
            {context.chinese && <p className="mnemonic-card__translation">{context.chinese}</p>}
          </section>
        )}
      </div>
    </aside>
  )
}
