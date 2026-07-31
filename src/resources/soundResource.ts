import type { LanguagePronunciationMap, SoundResource } from '@/typings'

export const SOUND_URL_PREFIX = './sounds/'
export const KEY_SOUND_URL_PREFIX = SOUND_URL_PREFIX + 'key-sound/'

const KEY_SOUND_FILENAMES = [
  'Default.wav',
  'Alpacas.mp3',
  'Buckling Spring.mp3',
  'Cherry MX Blacks.mp3',
  'Cherry MX Blues.mp3',
  'Cherry MX Browns.mp3',
  'Gateron Black Inks.mp3',
  'Gateron Red Inks.mp3',
  'Holy Pandas.mp3',
  'Kailh Box Navies.mp3',
  'NovelKeys Creams.mp3',
  'SKCM Blue Alps.mp3',
  'Topre.mp3',
  'Turquoise Tealios.mp3',
] as const

/**
 * the Mechanical keyboard sound from https://github.com/tplai/kbsim
 */
export const keySoundResources: SoundResource[] = KEY_SOUND_FILENAMES.map((filename) => {
  const name = filename.replace(/\.[^.]+$/, '')
  return { key: name, name, filename }
})

export const wrongSoundResources: SoundResource[] = [{ key: '1', name: '声音1', filename: 'beep.wav' }]

export const correctSoundResources: SoundResource[] = [{ key: '1', name: '声音1', filename: 'correct.wav' }]

export const LANG_PRON_MAP: LanguagePronunciationMap = {
  en: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '美音',
        pron: 'us',
      },
      {
        name: '英音',
        pron: 'uk',
      },
    ],
  },
  code: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '美音',
        pron: 'us',
      },
      {
        name: '英音',
        pron: 'uk',
      },
    ],
  },
  de: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '德语',
        pron: 'de',
      },
    ],
  },
  romaji: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '罗马音',
        pron: 'romaji',
      },
    ],
  },
  hapin: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '哈拼',
        pron: 'hapin',
      },
    ],
  },
  zh: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '普通话',
        pron: 'zh',
      },
    ],
  },
  ja: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '日语',
        pron: 'ja',
      },
    ],
  },
  kk: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '哈萨克语',
        pron: 'kk',
      },
    ],
  },
  id: {
    defaultPronIndex: 0,
    pronunciation: [
      {
        name: '印尼语',
        pron: 'id',
      },
    ],
  },
}
