import { WordDetailsDialog } from '@/components/WordDetailsDialog'
import { PracticeActionType, PracticeContext } from '@/pages/Practice/store'
import type { WordMnemonic } from '@/utils/wordExample'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'

type MnemonicDetailsProps = {
  word: string
  translations: string[]
  showMeaning: boolean
  mnemonic: WordMnemonic | null
  part?: 'meaning' | 'memory'
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

export default function MnemonicDetails({ word, translations, showMeaning, mnemonic, part = 'meaning' }: MnemonicDetailsProps) {
  const practiceContext = useContext(PracticeContext)
  const [imageFailed, setImageFailed] = useState(false)
  const [selectedSimilarWord, setSelectedSimilarWord] = useState<string | null>(null)
  const resumeTypingRef = useRef(false)

  useEffect(() => {
    setImageFailed(false)
  }, [word])

  const meaning = useMemo(() => mnemonic?.meaning ?? simplifyLocalMeaning(translations), [mnemonic?.meaning, translations])
  const imageUrl = imageFailed ? null : mnemonic?.imageUrl
  const hasMemoryCue = Boolean(mnemonic?.similarWords.length || imageUrl || mnemonic?.rootAnalysis)

  const openSimilarWord = (similarWord: string) => {
    resumeTypingRef.current = practiceContext?.state.isTyping ?? false
    practiceContext?.dispatch({ type: PracticeActionType.SET_IS_TYPING, payload: false })
    setSelectedSimilarWord(similarWord)
  }

  const closeSimilarWord = () => {
    setSelectedSimilarWord(null)
    if (resumeTypingRef.current) {
      practiceContext?.dispatch({ type: PracticeActionType.SET_IS_TYPING, payload: true })
    }
    resumeTypingRef.current = false
  }

  if (part === 'memory' && !hasMemoryCue) return null

  return (
    <div className={`mnemonic-details mnemonic-details--${part}`} aria-label={`${word} 助记信息`}>
      {part === 'meaning' && (
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
      )}

      {part === 'memory' && (
        <div className="mnemonic-details__memory">
          {Boolean(mnemonic?.similarWords.length) && (
            <div className="mnemonic-details__similar" aria-label="易混单词">
              <span className="mnemonic-details__similar-title">易混单词</span>
              <div>
                {mnemonic?.similarWords.map((item) => (
                  <button key={item.word} type="button" onClick={() => openSimilarWord(item.word)}>
                    <strong>{item.word}</strong>
                    <span>{item.meaning}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mnemonic?.rootAnalysis && (
            <div className="mnemonic-details__origin">
              <span>词根 / 来源</span>
              <p>{mnemonic.rootAnalysis}</p>
            </div>
          )}

          {imageUrl && (
            <figure className="mnemonic-details__visual">
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
              <img
                src={imageUrl}
                alt={`与 ${word} 常用义相关的核心画面`}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
            </figure>
          )}

          <WordDetailsDialog word={selectedSimilarWord} onClose={closeSimilarWord} />
        </div>
      )}
    </div>
  )
}
