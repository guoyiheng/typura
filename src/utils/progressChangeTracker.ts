import { markProgressUpdated } from '@/utils/db/progress-sync'

/** 这些键由同步流程自己维护，变化时不需要重新上传。 */
const IGNORED_KEYS = new Set(['progressUpdatedAt', 'progressSyncPassphrase'])

let isInstalled = false

/**
 * 进度的范围包含练习记录、章节进度、设置、当前词典与生词本，它们都会写入 localStorage。
 * 这里统一监听写入，让同步逻辑不需要在每个写入点单独埋点。
 */
export function installProgressChangeTracking() {
  if (isInstalled || typeof window === 'undefined') return
  isInstalled = true

  const originalSetItem = Storage.prototype.setItem

  Storage.prototype.setItem = function setItem(key: string, value: string) {
    originalSetItem.call(this, key, value)

    if (this === window.localStorage && !IGNORED_KEYS.has(key)) {
      markProgressUpdated()
    }
  }
}
