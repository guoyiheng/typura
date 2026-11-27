import { wordbookDictionary } from '@/resources/wordbook'
import type { WordbookEntry } from '@/store/wordbook'
import type { Dictionary, DictionaryResource, LanguageCategoryType, LanguageType, Word } from '@/typings'
import { getDictionaryChapter, getDictionaryChapterCount } from '@/utils'

export type DictionaryWordLocation = {
  chapter: number
  wordIndex: number
}

export function createWordbookEntry(word: Word, dictionary: Dictionary, addedAt = Date.now()): WordbookEntry {
  return {
    word: word.name,
    trans: word.trans,
    usphone: word.usphone,
    ukphone: word.ukphone,
    dictId: dictionary.id,
    dictName: dictionary.name,
    language: dictionary.language,
    languageCategory: dictionary.languageCategory,
    addedAt,
  }
}

export function wordbookEntryToWord(entry: WordbookEntry): Word {
  return {
    name: entry.word,
    trans: entry.trans,
    usphone: entry.usphone,
    ukphone: entry.ukphone,
  }
}

type WordbookLanguage = {
  language: LanguageType
  languageCategory: LanguageCategoryType
}

/** 生词本按收录单词的主要语言决定练习语言，取最先出现的最大值。 */
function getWordbookLanguage(entries: WordbookEntry[]): WordbookLanguage {
  const counts = new Map<LanguageCategoryType, { count: number; language: LanguageType }>()

  for (const entry of entries) {
    const current = counts.get(entry.languageCategory)
    if (current) {
      current.count += 1
      continue
    }
    counts.set(entry.languageCategory, { count: 1, language: entry.language })
  }

  let picked: { category: LanguageCategoryType; count: number; language: LanguageType } | undefined
  for (const [category, item] of counts) {
    if (!picked || item.count > picked.count) {
      picked = { category, ...item }
    }
  }

  return picked ? { language: picked.language, languageCategory: picked.category } : { language: 'en', languageCategory: 'en' }
}

/** 生词本的章节数量随收藏的单词数量变化。 */
export function getWordbookChapterCount(length: number, chapterLength: number): number {
  return getDictionaryChapterCount({ ...wordbookDictionary, length }, chapterLength)
}

/** 生词本在运行时被当作一个词典，章节按收藏顺序切分。 */
export function createWordbookDictionary(entries: WordbookEntry[], chapterLength: number): Dictionary {
  const { language, languageCategory } = getWordbookLanguage(entries)
  const resource: DictionaryResource = { ...wordbookDictionary, length: entries.length }

  return {
    ...resource,
    contentType: 'dictionary',
    language,
    languageCategory,
    chapterCount: getDictionaryChapterCount(resource, chapterLength),
  }
}

/** 把词典中的全局词序换算成章节序号与章节内序号。 */
export function getDictionaryWordLocation(
  dictionary: DictionaryResource,
  globalIndex: number,
  chapterLength: number,
): DictionaryWordLocation | undefined {
  if (!Number.isInteger(globalIndex) || globalIndex < 0) return undefined

  const chapterCount = getDictionaryChapterCount(dictionary, chapterLength)
  for (let chapter = 0; chapter < chapterCount; chapter += 1) {
    const chapterInfo = getDictionaryChapter(dictionary, chapter, chapterLength)
    if (!chapterInfo) continue
    if (globalIndex >= chapterInfo.start && globalIndex < chapterInfo.end) {
      return { chapter, wordIndex: globalIndex - chapterInfo.start }
    }
  }

  return undefined
}
