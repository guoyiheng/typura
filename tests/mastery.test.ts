import { MASTERY_WINDOW_SIZE, getMasteryAssessment, normalizeMasteryResults, recordMasteryResult } from '../src/utils/mastery.ts'
import assert from 'node:assert/strict'
import test from 'node:test'

test('按 60% 和 80% 成功率划分三档熟练度', () => {
  const familiar = getMasteryAssessment([true, true, true, true, false])
  assert.equal(familiar.successRate, 80)
  assert.equal(familiar.status, 'familiar')
  assert.equal(familiar.label, '熟悉')

  const blurry = getMasteryAssessment([true, true, true, false, false])
  assert.equal(blurry.successRate, 60)
  assert.equal(blurry.status, 'blurry')
  assert.equal(blurry.label, '模糊')

  const forgotten = getMasteryAssessment([true, true, false, false, false])
  assert.equal(forgotten.successRate, 40)
  assert.equal(forgotten.status, 'forgotten')
  assert.equal(forgotten.label, '生疏')

  const belowFamiliar = getMasteryAssessment([...Array<boolean>(15).fill(true), ...Array<boolean>(5).fill(false)])
  assert.equal(belowFamiliar.successRate, 75)
  assert.equal(belowFamiliar.status, 'blurry')

  const belowBlurry = getMasteryAssessment([...Array<boolean>(11).fill(true), ...Array<boolean>(9).fill(false)])
  assert.ok(Math.abs((belowBlurry.successRate ?? 0) - 55) < 1e-10)
  assert.equal(belowBlurry.status, 'forgotten')
})

test('没有结果时未评估，少于五次时为初步评估', () => {
  const unassessed = getMasteryAssessment([])
  assert.equal(unassessed.assessmentState, 'unassessed')
  assert.equal(unassessed.label, '未评估')
  assert.equal(unassessed.successRate, null)

  const preliminary = getMasteryAssessment([true, true, false, true])
  assert.equal(preliminary.assessmentState, 'preliminary')
  assert.equal(preliminary.label, '初步评估')
  assert.equal(preliminary.status, 'normal')
  assert.equal(preliminary.successRate, 75)

  const assessed = getMasteryAssessment([true, true, true, true, true])
  assert.equal(assessed.assessmentState, 'assessed')
  assert.equal(assessed.status, 'familiar')
})

test('新增结果只保留最近 20 次并淘汰最旧记录', () => {
  const history = [true, ...Array<boolean>(MASTERY_WINDOW_SIZE - 1).fill(false)]
  const latest = recordMasteryResult(history, false)

  assert.equal(latest.length, MASTERY_WINDOW_SIZE)
  assert.deepEqual(latest, Array<boolean>(MASTERY_WINDOW_SIZE).fill(false))
  assert.equal(getMasteryAssessment(latest).successRate, 0)
  assert.equal(recordMasteryResult(latest, true).at(-1), true)
})

test('旧数据中的无效结果会被过滤', () => {
  const normalized = normalizeMasteryResults([true, 'true', 1, null, false, undefined])
  assert.deepEqual(normalized, [true, false])

  const assessment = getMasteryAssessment(normalized)
  assert.equal(assessment.sampleCount, 2)
  assert.equal(assessment.successRate, 50)
  assert.deepEqual(normalizeMasteryResults(null), [])
  assert.deepEqual(normalizeMasteryResults(undefined), [])
})

test('记录结果不会修改传入数组', () => {
  const source = [true, false]
  const snapshot = [...source]
  const recorded = recordMasteryResult(source, true)

  assert.deepEqual(source, snapshot)
  assert.notStrictEqual(recorded, source)
  assert.deepEqual(recorded, [true, false, true])
})
