import { isTextSelectableAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings'
import { getWordPhonetic } from '@/utils/wordExample'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

type PhoneticProps = {
  word: WordWithIndex | Word
  type: 'us' | 'uk'
}

function normalizePhonetic(value: string) {
  return value
    .trim()
    .replace(/^\[|\]$/g, '')
    .replace(/^\/|\/$/g, '')
    .trim()
}

function isSupportedEnglishTerm(value: string) {
  return /^\p{Script=Latin}[\p{Script=Latin}' -]*$/u.test(value)
}

function Phonetic({ word, type }: PhoneticProps) {
  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  const dictionaryPhonetic = normalizePhonetic(type === 'us' ? word.usphone : word.ukphone)
  const [fallback, setFallback] = useState<{ word: string; usphone: string; ukphone: string } | null>(null)

  useEffect(() => {
    if (dictionaryPhonetic.length > 0 || !isSupportedEnglishTerm(word.name)) return

    let isActive = true
    void getWordPhonetic(word.name).then((phonetic) => {
      if (isActive && phonetic) setFallback({ word: word.name, ...phonetic })
    })
    return () => {
      isActive = false
    }
  }, [dictionaryPhonetic, word.name])

  const fallbackPhonetic = fallback?.word === word.name ? fallback[`${type}phone`] : ''
  const phonetic = dictionaryPhonetic.length > 0 ? dictionaryPhonetic : normalizePhonetic(fallbackPhonetic)

  if (!phonetic) return null

  return (
    <span
      className={`text-center text-sm font-normal text-[var(--muted)] transition-colors duration-300 ${isTextSelectable && 'select-text'}`}
    >
      {`${type === 'us' ? 'AmE' : 'BrE'}: [${phonetic}]`}
    </span>
  )
}

export default Phonetic
