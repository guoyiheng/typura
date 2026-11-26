import { decideProgressSync } from '../src/utils/progressSync.ts'
import assert from 'node:assert/strict'
import test from 'node:test'

test('云端没有进度时上传', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: true }), 'upload')
  assert.equal(decideProgressSync({ hasLocalProgress: false, localUpdatedAt: 100 }), 'upload')
})

test('两边都有时间标记时以较新的为准', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: true, localUpdatedAt: 200, remoteUpdatedAt: 100 }), 'upload')
  assert.equal(decideProgressSync({ hasLocalProgress: true, localUpdatedAt: 100, remoteUpdatedAt: 200 }), 'restore')
  assert.equal(decideProgressSync({ hasLocalProgress: true, localUpdatedAt: 100, remoteUpdatedAt: 100 }), 'upload')
})

test('本机没有时间标记时按是否存在进度决定', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: false, remoteUpdatedAt: 100 }), 'restore')
  assert.equal(decideProgressSync({ hasLocalProgress: true, remoteUpdatedAt: 100 }), 'conflict')
})
