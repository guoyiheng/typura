import {
  deserializeMasteryRound,
  serializeMasteryRound,
  transitionMasteryAttempt,
  transitionMasteryRound,
  type MasteryRound,
} from '../src/utils/masteryRound.ts'
import assert from 'node:assert/strict'
import test from 'node:test'

test('独立测验完成后只产生一次成功结果', () => {
  assert.deepEqual(transitionMasteryAttempt(undefined, 'begin', true), { attempt: 'eligible' })
  assert.deepEqual(transitionMasteryAttempt('eligible', 'complete', true), { attempt: 'success', result: true })
  assert.deepEqual(transitionMasteryAttempt('success', 'complete', true), { attempt: 'success' })
  assert.deepEqual(transitionMasteryAttempt('success', 'fail', true), { attempt: 'success' })
})

test('与对象属性重名的单词也能正常评估', () => {
  for (const word of ['constructor', 'toString', '__proto__']) {
    const started = transitionMasteryRound({ id: 'round', words: {} }, word, 'begin', true)
    const completed = transitionMasteryRound(started.round, word, 'complete', true)
    assert.equal(completed.result, true)
    assert.equal(completed.round.words[word], 'success')
  }
})

test('失败、补打和旧词曝光不会覆盖终态', () => {
  assert.deepEqual(transitionMasteryAttempt('eligible', 'fail', true), { attempt: 'failure', result: false })
  assert.deepEqual(transitionMasteryAttempt('failure', 'complete', true), { attempt: 'failure' })
  assert.deepEqual(transitionMasteryAttempt('eligible', 'expose', true), { attempt: 'failure', result: false })
  assert.deepEqual(transitionMasteryAttempt(undefined, 'expose', true), { attempt: 'excluded' })
})

test('模式切换结束进行中的测验，非独立模式也固定记为失败', () => {
  assert.deepEqual(transitionMasteryAttempt('eligible', 'begin', false), { attempt: 'failure', result: false })
  assert.deepEqual(transitionMasteryAttempt('eligible', 'expose', false), { attempt: 'failure', result: false })
  assert.deepEqual(transitionMasteryAttempt('eligible', 'fail', false), { attempt: 'failure', result: false })
  assert.deepEqual(transitionMasteryAttempt('eligible', 'complete', false), { attempt: 'failure', result: false })
  assert.deepEqual(transitionMasteryAttempt(undefined, 'begin', false), { attempt: 'excluded' })
})

test('未开始的词不能凭空成功，未来词曝光会被排除', () => {
  assert.deepEqual(transitionMasteryAttempt(undefined, 'complete', true), { attempt: 'excluded' })
  assert.deepEqual(transitionMasteryAttempt(undefined, 'fail', true), { attempt: 'excluded' })
  assert.deepEqual(transitionMasteryAttempt(undefined, 'expose', true), { attempt: 'excluded' })
})

test('返回旧词不会重复计分，刷新后的轮次仍保留终态', () => {
  const round: MasteryRound = { id: 'round-1', words: { alpha: 'success', beta: 'failure', gamma: 'excluded' } }
  const serialized = serializeMasteryRound(round)
  const restored = deserializeMasteryRound(serialized)
  assert.deepEqual(restored, round)
  assert.deepEqual(transitionMasteryRound(restored!, 'alpha', 'complete', true), { round: restored })
  assert.deepEqual(transitionMasteryRound(restored!, 'beta', 'fail', true), { round: restored })
})

test('学习到默写的模式切换会排除未开始的词', () => {
  const round: MasteryRound = { id: 'round-2', words: {} }
  const learned = transitionMasteryRound(round, 'learned-word', 'begin', false)
  assert.deepEqual(learned, { round: { id: 'round-2', words: { 'learned-word': 'excluded' } } })
  assert.deepEqual(transitionMasteryRound(learned.round, 'learned-word', 'begin', true), { round: learned.round })
})

test('显式创建新轮次后同一个词可以产生新的结果', () => {
  const firstRound: MasteryRound = { id: 'round-1', words: { alpha: 'success' } }
  const nextRound: MasteryRound = { id: 'round-2', words: {} }
  const started = transitionMasteryRound(nextRound, 'alpha', 'begin', true)
  assert.deepEqual(started, { round: { id: 'round-2', words: { alpha: 'eligible' } } })
  assert.deepEqual(transitionMasteryRound(started.round, 'alpha', 'complete', true), {
    round: { id: 'round-2', words: { alpha: 'success' } },
    result: true,
  })
  assert.notEqual(firstRound.id, nextRound.id)
})

test('非法或损坏的序列化数据不会恢复成轮次', () => {
  assert.equal(deserializeMasteryRound('not-json'), undefined)
  assert.deepEqual(deserializeMasteryRound(JSON.stringify({ id: 'round-3', words: { ok: 'success', bad: 'pending' } })), {
    id: 'round-3',
    words: { ok: 'success' },
  })
})
