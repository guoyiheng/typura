import type { DictionaryResource } from '@/typings'
import { getDictionaryChapter, getDictionaryChapterCount } from '@/utils'

export type DictionaryWordLocation = {
  chapter: number
  wordIndex: number
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
