import { defaultHotkeysConfig, formatShortcut, isUnsafeShortcut, normalizeHotkeysConfig } from '../src/utils/hotkeys.ts'
import type { HotkeysConfig } from '../src/utils/hotkeys.ts'
import assert from 'node:assert/strict'
import test from 'node:test'

test('默认快捷键为数字键 0-3 与方向键', () => {
  assert.equal(defaultHotkeysConfig.toggleZenMode, '0')
  assert.equal(defaultHotkeysConfig.playPause, '1')
  assert.equal(defaultHotkeysConfig.hint, '2')
  assert.equal(defaultHotkeysConfig.addToWordbook, '3')
  assert.equal(defaultHotkeysConfig.prevWord, 'left,up')
  assert.equal(defaultHotkeysConfig.nextWord, 'right,down')
})

test('缺失的快捷键项补齐为默认值，用户自定义保持不变', () => {
  const legacyConfig = { toggleZenMode: 'backquote', hint: 'ctrl+h', playPause: 'ctrl' } as Partial<HotkeysConfig>
  const config = normalizeHotkeysConfig(legacyConfig)

  assert.equal(config.addToWordbook, '3')
  assert.equal(config.prevWord, 'left,up')
  assert.equal(config.toggleZenMode, 'backquote')
  assert.equal(config.hint, 'ctrl+h')
  assert.equal(config.playPause, 'ctrl')
})

test('数字键可以作为快捷键且能被正常展示', () => {
  assert.equal(isUnsafeShortcut('3'), false)
  assert.equal(isUnsafeShortcut('0'), false)
  assert.equal(isUnsafeShortcut('a'), true)
  assert.equal(formatShortcut('3'), '3')
  assert.equal(formatShortcut('left,up'), '← / ↑')
})
