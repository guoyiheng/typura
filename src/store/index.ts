import atomForConfig from './atomForConfig'
import { reviewInfoAtom } from './reviewInfoAtom'
import { CHAPTER_LENGTH, defaultFontSizeConfig } from '@/constants'
import { idDictionaryMap } from '@/resources/dictionary'
import { correctSoundResources, keySoundResources, wrongSoundResources } from '@/resources/soundResource'
import type { Dictionary, LoopWordTimesOption, PhoneticType, PronunciationType, WordDictationOpenBy, WordDictationType } from '@/typings'
import { getDictionaryChapter, getDictionaryChapterCount } from '@/utils'
import type { ReviewRecord } from '@/utils/db/record'
import { defaultHotkeysConfig } from '@/utils/hotkeys'
import type { HotkeysConfig } from '@/utils/hotkeys'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const chapterLengthConfigAtom = atomForConfig<{ length: number }>('chapterLengthConfig', {
  length: CHAPTER_LENGTH,
})
export const chapterLengthAtom = atom((get) => get(chapterLengthConfigAtom).length)

export const currentDictIdAtom = atomWithStorage('currentDict', 'IELTSVocabularyBible')
export const currentDictInfoAtom = atom<Dictionary>((get) => {
  const id = get(currentDictIdAtom)
  const chapterLength = get(chapterLengthAtom)
  let dict = idDictionaryMap[id]
  // 如果 dict 不存在，则返回 IELTSVocabularyBible。Practice 会校验 DictId，并在无效时恢复默认词典。
  if (!dict) {
    dict = idDictionaryMap.IELTSVocabularyBible
  }
  return {
    ...dict,
    chapterCount: getDictionaryChapterCount(dict, chapterLength),
  }
})

export const currentChapterAtom = atomWithStorage('currentChapter', 0)
export const currentChapterInfoAtom = atom((get) =>
  getDictionaryChapter(get(currentDictInfoAtom), get(currentChapterAtom), get(chapterLengthAtom)),
)

export const loopWordConfigAtom = atomForConfig<{ times: LoopWordTimesOption }>('loopWordConfig', {
  times: 1,
})

export const keySoundsConfigAtom = atomForConfig('keySoundsConfig', {
  isOpen: true,
  isOpenClickSound: true,
  volume: 1,
  resource: keySoundResources[0],
})

export const hintSoundsConfigAtom = atomForConfig('hintSoundsConfig', {
  isOpen: true,
  volume: 1,
  isOpenWrongSound: true,
  isOpenCorrectSound: true,
  wrongResource: wrongSoundResources[0],
  correctResource: correctSoundResources[0],
})

export const pronunciationConfigAtom = atomForConfig('pronunciation', {
  isOpen: true,
  volume: 1,
  type: 'uk' as PronunciationType,
  name: '英音',
  isLoop: false,
  isTransRead: false,
  transVolume: 1,
  rate: 1,
})

export const fontSizeConfigAtom = atomForConfig('fontsize', defaultFontSizeConfig)
export const bookFontSizeConfigAtom = atomForConfig('bookFontSize', { size: 22 })

export const pronunciationIsOpenAtom = atom((get) => get(pronunciationConfigAtom).isOpen)

export const randomConfigAtom = atomForConfig('randomConfig', {
  isOpen: false,
})

export const isIgnoreCaseAtom = atomWithStorage('isIgnoreCase', true)

export const isShowAnswerOnHoverAtom = atomWithStorage('isShowAnswerOnHover', true)

export const isTextSelectableAtom = atomWithStorage('isTextSelectable', true)

export const isMnemonicEnabledAtom = atomWithStorage('isMnemonicEnabled', true)

export const reviewModeInfoAtom = reviewInfoAtom({
  isReviewMode: false,
  reviewRecord: undefined as ReviewRecord | undefined,
})
export const isReviewModeAtom = atom((get) => get(reviewModeInfoAtom).isReviewMode)

export const phoneticConfigAtom = atomForConfig('phoneticConfig', {
  isOpen: true,
  type: 'uk' as PhoneticType,
})

export const isOpenDarkModeAtom = atomWithStorage('isOpenDarkModeAtom', window.matchMedia('(prefers-color-scheme: dark)').matches)

export const wordDictationConfigAtom = atomForConfig('wordDictationConfig', {
  isOpen: true,
  type: 'hideAll' as WordDictationType,
  openBy: 'auto' as WordDictationOpenBy,
  isReadBefore: true,
  isReadAfter: true,
  isLearnReadBefore: true,
  isLearnReadAfter: true,
})

// Whether to restart spelling the word from the beginning upon typo
export const restartOnWrongAtom = atomWithStorage('restartOnWrong', false)

export const hotkeysConfigAtom = atomForConfig<HotkeysConfig>('hotkeysConfig', defaultHotkeysConfig)

type WordStatus = 'forgotten' | 'blurry' | 'familiar' | 'normal'
export interface WordStatItem {
  correctStreak: number
  status: WordStatus
  learnCount: number // 学习次数 (普通模式拼写成功数)
  dictationCount: number // 默写次数 (默写模式拼写成功数)
  successCount: number // 成功次数 (wrongCount === 0 成功数)
  failCount: number // 失败次数 (wrongCount > 0 失败数)
}
export const wordStatsAtom = atomWithStorage<Record<string, WordStatItem>>('wordStats', {})

type DictProgressItem = {
  chapter: number
  index: number
}

export type DictProgressMap = Record<string, DictProgressItem>

const getStoredLearnProgress = (): DictProgressMap => {
  try {
    const stored = window.localStorage.getItem('learnProgress')
    if (stored) return JSON.parse(stored)

    const oldDictProgress = window.localStorage.getItem('dictProgress')
    if (oldDictProgress) {
      const parsed = JSON.parse(oldDictProgress)
      const migrated: DictProgressMap = {}
      for (const [id, val] of Object.entries(parsed)) {
        const item = val as { lastChapter?: number; chapters?: Record<number, number> }
        const lastChapter = item?.lastChapter ?? 0
        const index = item?.chapters?.[lastChapter] ?? 0
        migrated[id] = { chapter: lastChapter, index }
      }
      return migrated
    }
  } catch (e) {
    console.error(e)
  }
  return {}
}

const getStoredDictationProgress = (): DictProgressMap => {
  try {
    const stored = window.localStorage.getItem('dictationProgress')
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error(e)
  }
  return {}
}

export const learnProgressAtom = atomWithStorage<DictProgressMap>('learnProgress', getStoredLearnProgress())
export const dictationProgressAtom = atomWithStorage<DictProgressMap>('dictationProgress', getStoredDictationProgress())

export const isZenModeAtom = atomWithStorage('isZenMode', false)
