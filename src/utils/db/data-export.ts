import { db } from '.'
import { getCurrentDate } from '..'

export type ExportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export type ImportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export async function exportDatabase(callback: (exportProgress: ExportProgress) => boolean) {
  const [pako, { saveAs }] = await Promise.all([import('pako'), import('file-saver'), import('dexie-export-import')])

  const blob = await db.export({
    progressCallback: ({ totalRows, completedRows, done }) => {
      return callback({ totalRows, completedRows, done })
    },
  })
  const dexieJson = await blob.text()

  // 收集当前所有的 localStorage 配置项与练习进度数据
  const localStorageData: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const val = localStorage.getItem(key)
      if (val !== null) {
        localStorageData[key] = val
      }
    }
  }

  const exportPayload = {
    version: 2,
    exportDate: new Date().toISOString(),
    localStorageData,
    dexieJson,
  }

  const jsonString = JSON.stringify(exportPayload)
  const compressed = pako.gzip(jsonString)
  const compressedBlob = new Blob([Uint8Array.from(compressed).buffer])
  const currentDate = getCurrentDate()
  saveAs(compressedBlob, `Typura-Backup-${currentDate}.gz`)
}

export async function importDatabase(onStart: () => void, callback: (importProgress: ImportProgress) => boolean) {
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.gz,application/gzip,application/x-gzip'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    onStart()

    try {
      const compressed = await file.arrayBuffer()
      const jsonString = pako.ungzip(new Uint8Array(compressed), { toText: true })

      let dexieJsonText = jsonString
      let localStorageData: Record<string, string> | undefined

      try {
        const parsed = JSON.parse(jsonString)
        if (parsed && typeof parsed === 'object' && ('dexieJson' in parsed || 'localStorageData' in parsed)) {
          dexieJsonText = parsed.dexieJson || ''
          localStorageData = parsed.localStorageData
        }
      } catch {
        // 如果解析包装 JSON 失败，说明是旧版直接导出 Dexie JSON 的备份文件
      }

      // 还原所有系统设置项与本地存储
      if (localStorageData && typeof localStorageData === 'object') {
        Object.entries(localStorageData).forEach(([k, v]) => {
          if (typeof v === 'string') {
            localStorage.setItem(k, v)
          }
        })
      }

      if (dexieJsonText) {
        const blob = new Blob([dexieJsonText])
        await db.import(blob, {
          acceptVersionDiff: true,
          acceptMissingTables: true,
          acceptNameDiff: false,
          acceptChangedPrimaryKey: false,
          overwriteValues: true,
          clearTablesBeforeImport: true,
          progressCallback: ({ totalRows, completedRows, done }) => {
            return callback({ totalRows, completedRows, done })
          },
        })
      } else {
        callback({ completedRows: 1, done: true })
      }

      // 延迟刷新页面以生效所有新的本地配置与 Jotai 原子状态
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err) {
      console.error('Import failed:', err)
      alert('数据导入失败，请检查备份文件格式是否正确。')
      callback({ completedRows: 0, done: true })
    }
  })

  input.click()
}
