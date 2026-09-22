/**
 * 熟练度评估使用的单次独立默写结果。
 * true 表示整词无错完成，false 表示出错或使用了提示。
 */
export type MasteryResult = boolean

/** 当前实现保留的最近结果数。 */
export const MASTERY_WINDOW_SIZE = 20

/** 少于此数量时只展示初步评估，不确定正式档位。 */
export const MASTERY_MIN_SAMPLE_SIZE = 5
export const MASTERY_ANSWER_EXPOSED_EVENT = 'typura-mastery-answer-exposed'

export function emitMasteryAnswerExposed(word: string) {
  window.dispatchEvent(new CustomEvent<{ word: string }>(MASTERY_ANSWER_EXPOSED_EVENT, { detail: { word } }))
}

/**
 * 词条统计中已有的状态值。保留这些值可以让旧的 localStorage 和备份数据
 * 继续被读取；新的成功率评估只在样本足够时写入正式状态。
 */
export type LegacyMasteryStatus = 'normal' | 'forgotten' | 'blurry' | 'familiar'
export type MasteryStatus = LegacyMasteryStatus
export type MasteryAssessmentState = 'unassessed' | 'preliminary' | 'assessed'
export type MasteryLabel = '未评估' | '初步评估' | '生疏' | '模糊' | '熟悉'

export interface MasteryAssessment {
  /** 参与评估的最近结果（由旧到新）。 */
  recentResults: MasteryResult[]
  sampleCount: number
  successCount: number
  /** 成功率百分比，保留原始小数；无样本时为 null。 */
  successRate: number | null
  /** 0 到 1 的原始比例，便于按阈值做精确判断；无样本时为 null。 */
  successRatio: number | null
  /** 与旧 WordStatItem.status 兼容的状态值。 */
  status: MasteryStatus
  assessmentState: MasteryAssessmentState
  label: MasteryLabel
}

/**
 * 规整来自 localStorage/旧备份的结果列表。
 * 非布尔值会被忽略，并且始终只保留最近 20 条，避免脏数据影响评估。
 */
export function normalizeMasteryResults(results: readonly unknown[] | null | undefined): MasteryResult[] {
  if (!Array.isArray(results)) return []
  return results.filter((result): result is MasteryResult => typeof result === 'boolean').slice(-MASTERY_WINDOW_SIZE)
}

/** 记录一次新的独立默写结果，并返回不超过 20 条的新列表。不会修改传入数组。 */
export function recordMasteryResult(results: readonly MasteryResult[] | null | undefined, success: MasteryResult): MasteryResult[] {
  return [...normalizeMasteryResults(results), success].slice(-MASTERY_WINDOW_SIZE)
}

/** 计算百分比成功率；没有有效结果时返回 null。 */
export function getMasterySuccessRate(results: readonly MasteryResult[] | null | undefined): number | null {
  const normalizedResults = normalizeMasteryResults(results)
  if (normalizedResults.length === 0) return null

  const successCount = normalizedResults.filter(Boolean).length
  return (successCount / normalizedResults.length) * 100
}

/** 将成功率映射为与旧状态字段兼容的正式档位。 */
export function getMasteryStatus(successRate: number | null): MasteryStatus {
  if (successRate === null) return 'normal'
  if (successRate < 60) return 'forgotten'
  if (successRate < 80) return 'blurry'
  return 'familiar'
}

export function getMasteryAssessment(results: readonly MasteryResult[] | null | undefined): MasteryAssessment {
  const recentResults = normalizeMasteryResults(results)
  const sampleCount = recentResults.length
  const successCount = recentResults.filter(Boolean).length
  const successRatio = sampleCount > 0 ? successCount / sampleCount : null
  const successRate = successRatio === null ? null : successRatio * 100

  if (sampleCount === 0) {
    return {
      recentResults,
      sampleCount,
      successCount,
      successRate,
      successRatio,
      status: 'normal',
      assessmentState: 'unassessed',
      label: '未评估',
    }
  }

  if (sampleCount < MASTERY_MIN_SAMPLE_SIZE) {
    return {
      recentResults,
      sampleCount,
      successCount,
      successRate,
      successRatio,
      status: 'normal',
      assessmentState: 'preliminary',
      label: '初步评估',
    }
  }

  const status = getMasteryStatus(successRate)
  const label: MasteryLabel = status === 'forgotten' ? '生疏' : status === 'blurry' ? '模糊' : '熟悉'

  return {
    recentResults,
    sampleCount,
    successCount,
    successRate,
    successRatio,
    status,
    assessmentState: 'assessed',
    label,
  }
}

// 这些别名让调用方可以按“记录 / 计算 / 评估”的语义选择名称，同时保持单一实现。
export const appendMasteryResult = recordMasteryResult
export const calculateMasterySuccessRate = getMasterySuccessRate
export const assessMastery = getMasteryAssessment
export const appendDictationResult = recordMasteryResult
export const calculateSuccessRate = getMasterySuccessRate
