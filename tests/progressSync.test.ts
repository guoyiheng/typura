import { decideProgressSync } from '../src/utils/progressSync.ts'
import assert from 'node:assert/strict'
import test from 'node:test'

test('云端没有进度时上传', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: true }), 'upload')
  assert.equal(decideProgressSync({ hasLocalProgress: false, localUpdatedAt: 100 }), 'upload')
})

test('两边都有进度时以较新的为准', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: true, localUpdatedAt: 200, remoteUpdatedAt: 100 }), 'upload')
  assert.equal(decideProgressSync({ hasLocalProgress: true, localUpdatedAt: 100, remoteUpdatedAt: 200 }), 'restore')
  assert.equal(decideProgressSync({ hasLocalProgress: true, localUpdatedAt: 100, remoteUpdatedAt: 100 }), 'upload')
})

test('本机没有真实进度时恢复云端，不覆盖云端数据', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: false, remoteUpdatedAt: 100 }), 'restore')
  assert.equal(decideProgressSync({ hasLocalProgress: false, localUpdatedAt: 999, remoteUpdatedAt: 100 }), 'restore')
})

test('本机有进度但没有时间标记时交给用户选择', () => {
  assert.equal(decideProgressSync({ hasLocalProgress: true, remoteUpdatedAt: 100 }), 'conflict')
})
