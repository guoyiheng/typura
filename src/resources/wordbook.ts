import type { Dictionary, DictionaryResource } from '@/typings'

export const WORDBOOK_DICT_ID = 'wordbook'

export const wordbookDictionaryResource: DictionaryResource = {
  id: WORDBOOK_DICT_ID,
  name: '生词本',
  description: '把练习中收藏的单词集中起来继续练习',
  category: '我的词典',
  tags: [],
  url: '',
  length: 0,
  language: 'en',
  languageCategory: 'en',
}

export const wordbookDictionary: Dictionary = {
  ...wordbookDictionaryResource,
  contentType: 'dictionary',
  chapterCount: 0,
}
