import { CHAPTER_LENGTH } from '@/constants'
import type { DictionaryResource } from '@/typings'
import type { Howl } from 'howler'

const bannedKeys = [
  'Enter',
  'Backspace',
  'Delete',
  'Tab',
  'CapsLock',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'Escape',
  'Fn',
  'FnLock',
  'Hyper',
  'Super',
  'OS',
  // Up, down, left and right keys
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  // volume keys
  'AudioVolumeUp',
  'AudioVolumeDown',
  'AudioVolumeMute',
  // special keys
  'End',
  'PageDown',
  'PageUp',
  'Clear',
  'Home',
]

export const isLegal = (key: string): boolean => {
  if (bannedKeys.includes(key)) return false
  return true
}

export const isChineseSymbol = (val: string): boolean =>
  /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/.test(
    val,
  )

export const IsDesktop = () => {
  const userAgentInfo = navigator.userAgent
  const Agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod']

  let flag = true
  for (let v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false
      break
    }
  }
  return flag
}

const IS_MAC_OS = navigator.userAgent.indexOf('Macintosh') !== -1

export const CTRL = IS_MAC_OS ? 'Control' : 'Ctrl'

export function addHowlListener(howl: Howl, ...args: Parameters<Howl['on']>) {
  howl.on(...args)

  return () => howl.off(...args)
}

export function classNames(...classNames: Array<string | void | null>) {
  const finallyClassNames: string[] = []

  for (const className of classNames) {
    if (className) {
      finallyClassNames.push(className.trim())
    }
  }

  return finallyClassNames.join(' ')
}

export function getCurrentDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = ('0' + (date.getMonth() + 1)).slice(-2)
  const day = ('0' + date.getDate()).slice(-2)

  return `${year}${month}${day}`
}

export function calcChapterCount(length: number, chapterLength = CHAPTER_LENGTH) {
  return Math.ceil(length / chapterLength)
}

export function getDictionaryChapterLength(
  dictionary: Pick<DictionaryResource, 'defaultChapterLength'>,
  customChapterLength = CHAPTER_LENGTH,
) {
  const nativeLength = dictionary.defaultChapterLength
  if (typeof nativeLength === 'number' && Number.isInteger(nativeLength) && nativeLength > 0) return nativeLength
  return Number.isInteger(customChapterLength) && customChapterLength > 0 ? customChapterLength : CHAPTER_LENGTH
}

type DictionaryChapterSource = Pick<DictionaryResource, 'chapters' | 'defaultChapterLength' | 'length'>

export type DictionaryChapterInfo = {
  name: string
  start: number
  end: number
  wordCount: number
}

export function hasDictionaryPresetChapters(dictionary: Pick<DictionaryChapterSource, 'chapters' | 'length'>) {
  const chapters = dictionary.chapters
  if (!chapters?.length || chapters[0].start !== 0) return false

  return chapters.every((chapter, index) => {
    const nextStart = chapters[index + 1]?.start ?? dictionary.length
    return (
      typeof chapter.name === 'string' &&
      chapter.name.trim().length > 0 &&
      Number.isInteger(chapter.start) &&
      chapter.start >= 0 &&
      chapter.start < dictionary.length &&
      Number.isInteger(nextStart) &&
      nextStart > chapter.start &&
      nextStart <= dictionary.length
    )
  })
}

export function getDictionaryChapterCount(dictionary: DictionaryChapterSource, customChapterLength = CHAPTER_LENGTH) {
  return hasDictionaryPresetChapters(dictionary)
    ? dictionary.chapters!.length
    : calcChapterCount(dictionary.length, getDictionaryChapterLength(dictionary, customChapterLength))
}

export function getDictionaryChapter(
  dictionary: DictionaryChapterSource,
  chapterIndex: number,
  customChapterLength = CHAPTER_LENGTH,
): DictionaryChapterInfo | undefined {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0) return undefined

  const hasPresetChapters = hasDictionaryPresetChapters(dictionary)
  const presetChapter = hasPresetChapters ? dictionary.chapters?.[chapterIndex] : undefined
  if (presetChapter) {
    const end = dictionary.chapters?.[chapterIndex + 1]?.start ?? dictionary.length
    return {
      name: presetChapter.name,
      start: presetChapter.start,
      end,
      wordCount: end - presetChapter.start,
    }
  }

  if (hasPresetChapters) return undefined

  const chapterLength = getDictionaryChapterLength(dictionary, customChapterLength)
  const start = chapterIndex * chapterLength
  if (start >= dictionary.length) return undefined
  const end = Math.min(start + chapterLength, dictionary.length)
  return {
    name: `第 ${chapterIndex + 1} 章`,
    start,
    end,
    wordCount: end - start,
  }
}

export function toFixedNumber(number: number, fractionDigits: number) {
  return Number((number ?? 0).toFixed(fractionDigits))
}

export function getUTCUnixTimestamp() {
  const now = new Date()
  return Math.floor(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ) / 1000,
  )
}

export function timeStamp2String(timestamp: number) {
  const date = new Date(timestamp * 1000)

  const dateString = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  const timeString = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  return `${dateString} ${timeString}`
}

/**
 * 根据不同的词性将单词含义拆分为多行展示
 * 例如: "n. 地壳 vi. 结硬皮 vt. 盖以硬皮" -> ["n. 地壳", "vi. 结硬皮", "vt. 盖以硬皮"]
 */
export function formatTransByPOS(trans: string | string[]): string[] {
  if (!trans) return []

  const rawList = Array.isArray(trans) ? trans : [trans]
  const posRegex = /(?=\b(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|interj|abbr|aux|modal|pref|suff|a|ad|int|phr)\.)/gi

  const result: string[] = []

  for (const item of rawList) {
    if (typeof item !== 'string' || !item.trim()) continue

    const parts = item.split(posRegex)
    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed) {
        result.push(trimmed)
      }
    }
  }

  return result.length > 0 ? result : [Array.isArray(trans) ? trans.join('；') : String(trans)]
}

/**
 * 比较输入的字符与期望的字符是否匹配。
 * 支持常规字符对比以及带变音符号/波浪号字符（如 ñ -> n, Ñ -> N）的降级比对。
 */
export function isCharacterMatch(
  typedCharacter: string,
  expectedCharacter: string,
  isIgnoreCase: boolean,
): boolean {
  if (isIgnoreCase) {
    if (typedCharacter.toLowerCase() === expectedCharacter.toLowerCase()) {
      return true
    }
  } else {
    if (typedCharacter === expectedCharacter) {
      return true
    }
  }

  // 去除变音符号/波浪号（例如 'ñ' -> 'n', 'Ñ' -> 'N'）后进行对比
  const normalizeChar = (ch: string) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const normTyped = normalizeChar(typedCharacter)
  const normExpected = normalizeChar(expectedCharacter)

  if (isIgnoreCase) {
    return normTyped.toLowerCase() === normExpected.toLowerCase()
  }
  return normTyped === normExpected
}
