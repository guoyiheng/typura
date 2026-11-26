import { syncPassphraseAtom } from '@/store/progressSync'
import {
  flushProgressUpload,
  isValidSyncPassphrase,
  normalizePassphrase,
  pullLatestProgress,
  startAutoSync,
  stopAutoSync,
} from '@/utils/db/progress-sync'
import { useAtomValue } from 'jotai'
import { useEffect } from 'react'

/**
 * 绑定口令后自动同步进度：
 * 进入页面拉取最新进度，进度变化后自动上传，页面隐藏或关闭前尽量补一次上传。
 */
export function useProgressAutoSync() {
  const passphrase = useAtomValue(syncPassphraseAtom)

  useEffect(() => {
    const normalized = normalizePassphrase(passphrase)
    if (!isValidSyncPassphrase(normalized)) {
      stopAutoSync()
      return
    }

    startAutoSync(normalized)
    let isActive = true

    const pullIfNeeded = async () => {
      const result = await pullLatestProgress(normalized)
      if (isActive && result === 'restored') {
        window.location.reload()
      }
    }

    void pullIfNeeded().catch((error) => console.error(error))

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushProgressUpload(true)
        return
      }
      void pullIfNeeded().catch((error) => console.error(error))
    }
    const handlePageHide = () => {
      void flushProgressUpload(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      isActive = false
      stopAutoSync()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [passphrase])
}
