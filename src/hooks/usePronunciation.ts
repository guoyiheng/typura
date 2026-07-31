import { pronunciationConfigAtom } from '@/store'
import type { PronunciationType } from '@/typings'
import { romajiToHiragana } from '@/utils/kana'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='
export function generateWordSoundSrc(word: string, pronunciation: Exclude<PronunciationType, false>): string {
  let audioText = word
  let language: string | undefined
  let type: 'us' | 'uk' | undefined

  switch (pronunciation) {
    case 'uk':
      type = 'uk'
      break
    case 'us':
      type = 'us'
      break
    case 'romaji':
      audioText = romajiToHiragana(word)
      language = 'romaji'
      break
    case 'zh':
      language = 'zh'
      break
    case 'ja':
      language = 'ja'
      break
    case 'de':
      language = 'de'
      break
    case 'hapin':
    case 'kk':
      language = pronunciation
      break
    case 'id':
      language = 'id'
      break
    default:
      return ''
  }

  const query = encodeURIComponent(audioText)
  if (type === 'uk') return `${pronunciationApi}${query}&type=1`
  if (type === 'us') return `${pronunciationApi}${query}&type=2`
  if (language === 'romaji' || language === 'ja') return `${pronunciationApi}${query}&le=jap`
  if (language === 'zh') return `${pronunciationApi}${query}&le=zh`
  if (language === 'de') return `${pronunciationApi}${query}&le=de`
  if (language === 'hapin' || language === 'kk') return `${pronunciationApi}${query}&le=ru`
  if (language === 'id') return `${pronunciationApi}${query}&le=id`
  return ''
}

export default function usePronunciationSound(word: string, isLoop?: boolean, pronunciationType?: PronunciationType) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const selectedType = pronunciationType ?? pronunciationConfig.type
  const soundUrl = useMemo(() => generateWordSoundSrc(word, selectedType), [selectedType, word])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (!soundUrl) return

    let audio = audioRef.current
    if (!audio) {
      audio = new Audio(soundUrl)
      audioRef.current = audio
    }

    audio.loop = loop
    audio.volume = pronunciationConfig.volume
    audio.playbackRate = pronunciationConfig.rate
    audio.currentTime = 0
    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => setIsPlaying(false)
    void audio.play().catch(() => setIsPlaying(false))
  }, [loop, pronunciationConfig.rate, pronunciationConfig.volume, soundUrl])

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [soundUrl])

  return { play, stop, isPlaying }
}

const prefetchedAudioUrls = new Set<string>()
const preloadedAudios: HTMLAudioElement[] = []
const MAX_PRELOAD_AUDIO_CACHE = 8

function prefetchAudioUrl(url: string) {
  if (!url || prefetchedAudioUrls.has(url)) return
  prefetchedAudioUrls.add(url)
  try {
    const audio = new Audio()
    audio.src = url
    audio.preload = 'auto'
    preloadedAudios.push(audio)

    if (preloadedAudios.length > MAX_PRELOAD_AUDIO_CACHE) {
      const removed = preloadedAudios.shift()
      if (removed) {
        removed.removeAttribute('src')
        removed.load()
      }
    }
  } catch (error) {
    console.error('Failed to prefetch audio', error)
  }
}

export function usePrefetchPronunciationSound(words: string | string[] | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const wordList = useMemo(() => (Array.isArray(words) ? words : words ? [words] : []), [words])

  useEffect(() => {
    const validWords = Array.from(new Set(wordList.filter(Boolean)))
    if (validWords.length === 0) return

    validWords.forEach((word) => {
      const soundUrl = generateWordSoundSrc(word, pronunciationConfig.type)
      if (soundUrl) {
        prefetchAudioUrl(soundUrl)
      }
    })
  }, [pronunciationConfig.type, wordList])
}
