import assert from 'node:assert/strict'
import test from 'node:test'
import { createStore } from 'jotai/vanilla'
import { createServer } from 'vite'

test('熟练度事件 atom 持久化结果并对同一轮去重', async (t) => {
  const previousWindow = globalThis.window
  const previousLocalStorage = globalThis.localStorage
  const entries = new Map()
  const localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
    clear: () => entries.clear(),
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
  }
  globalThis.window = {
    localStorage,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.localStorage = localStorage

  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  const unsubscribers = []
  try {
    const { recordMasteryEventAtom } = await server.ssrLoadModule('/src/store/mastery.ts')
    const { masteryRoundsAtom, wordStatsAtom } = await server.ssrLoadModule('/src/store/index.ts')
    const createFreshStore = () => {
      const store = createStore()
      store.set(masteryRoundsAtom, {})
      store.set(wordStatsAtom, {})
      return store
    }
    const send = (store, word, event, independent = true, scope = 'dictionary:chapter:1') =>
      store.set(recordMasteryEventAtom, { scope, word, event, independent })

    await t.test('失败后补打、返回和重复完成只保留一次失败', () => {
      const store = createFreshStore()
      send(store, 'failure', 'begin')
      send(store, 'failure', 'fail')
      send(store, 'failure', 'complete')
      send(store, 'failure', 'begin')
      send(store, 'failure', 'complete')
      assert.deepEqual(store.get(wordStatsAtom).failure.recentDictationResults, [false])
    })

    await t.test('未来单词先曝光再开始、完成不写入结果', () => {
      const store = createFreshStore()
      send(store, 'future', 'expose')
      send(store, 'future', 'begin')
      send(store, 'future', 'complete')
      assert.deepEqual(store.get(wordStatsAtom), {})
      assert.equal(store.get(masteryRoundsAtom)['dictionary:chapter:1'].words.future, 'excluded')
    })

    await t.test('学习模式已展示的词切到隐藏模式完成仍不计分', () => {
      const store = createFreshStore()
      send(store, 'visible', 'begin', false)
      send(store, 'visible', 'begin', true)
      send(store, 'visible', 'complete', true)
      assert.deepEqual(store.get(wordStatsAtom), {})
    })

    await t.test('成功后的重复完成只写入一次成功', () => {
      const store = createFreshStore()
      send(store, 'success', 'begin')
      send(store, 'success', 'complete')
      send(store, 'success', 'complete')
      send(store, 'success', 'fail')
      assert.deepEqual(store.get(wordStatsAtom).success.recentDictationResults, [true])
    })

    await t.test('JSON 存储恢复到新 store 后再次完成不重复计分', () => {
      const store = createFreshStore()
      send(store, 'persisted', 'begin')
      send(store, 'persisted', 'complete')
      const savedRounds = JSON.parse(localStorage.getItem('masteryRounds'))
      const savedStats = JSON.parse(localStorage.getItem('wordStats'))
      localStorage.clear()
      localStorage.setItem('masteryRounds', JSON.stringify(savedRounds))
      localStorage.setItem('wordStats', JSON.stringify(savedStats))

      const restoredStore = createStore()
      unsubscribers.push(restoredStore.sub(masteryRoundsAtom, () => {}), restoredStore.sub(wordStatsAtom, () => {}))
      assert.deepEqual(restoredStore.get(masteryRoundsAtom), savedRounds)
      assert.deepEqual(restoredStore.get(wordStatsAtom), savedStats)
      send(restoredStore, 'persisted', 'begin')
      send(restoredStore, 'persisted', 'complete')
      assert.deepEqual(restoredStore.get(wordStatsAtom).persisted.recentDictationResults, [true])
    })

    await t.test('清除当前轮次后重新开始可以产生新结果', () => {
      const store = createFreshStore()
      send(store, 'repeat', 'begin')
      send(store, 'repeat', 'complete')
      store.set(masteryRoundsAtom, {})
      send(store, 'repeat', 'begin')
      send(store, 'repeat', 'complete')
      assert.deepEqual(store.get(wordStatsAtom).repeat.recentDictationResults, [true, true])
    })

    await t.test('新结果保留历史计数并只保留最近 20 个结果', () => {
      const store = createFreshStore()
      const legacy = {
        correctStreak: 8,
        status: 'familiar',
        learnCount: 12,
        dictationCount: 23,
        successCount: 34,
        failCount: 45,
        recentDictationResults: [true, ...Array(19).fill(false)],
      }
      store.set(wordStatsAtom, { legacy })
      send(store, 'legacy', 'begin')
      send(store, 'legacy', 'fail')
      const stats = store.get(wordStatsAtom).legacy
      assert.deepEqual(stats.recentDictationResults, Array(20).fill(false))
      assert.equal(stats.learnCount, 12)
      assert.equal(stats.dictationCount, 23)
      assert.equal(stats.successCount, 34)
      assert.equal(stats.failCount, 45)
      assert.equal(stats.status, 'forgotten')
    })
  } finally {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
    await server.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
    if (previousLocalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousLocalStorage
  }
})
