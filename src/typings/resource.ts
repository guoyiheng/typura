import type { LanguageCategoryType, LanguageType, PracticeContentType, PronunciationType } from '.'

export type DictionaryChapter = {
  name: string
  // Zero-based index of the first word in this chapter.
  start: number
}

export type DictionaryResource = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: LanguageType
  languageCategory: LanguageCategoryType
  contentType?: PracticeContentType
  author?: string
  subtitle?: string
  // 词典原生的不等长章节；未设置时按章节词数切分
  chapters?: DictionaryChapter[]
  // 词典原生章节的固定词数；未设置时使用用户自定义章节长度
  defaultChapterLength?: number
  //override default pronunciation when not undefined
  defaultPronIndex?: number
}

export type Dictionary = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: LanguageType
  languageCategory: LanguageCategoryType
  contentType: PracticeContentType
  author?: string
  subtitle?: string
  chapters?: DictionaryChapter[]
  defaultChapterLength?: number
  // calculated in the store
  chapterCount: number
  //override default pronunciation when not undefined
  defaultPronIndex?: number
}

type PronunciationConfig = {
  name: string
  pron: PronunciationType
}

type LanguagePronunciationMapConfig = {
  defaultPronIndex: number
  pronunciation: PronunciationConfig[]
}

export type LanguagePronunciationMap = {
  [key in LanguageType]: LanguagePronunciationMapConfig
}

export type SoundResource = {
  key: string
  name: string
  filename: string
}
