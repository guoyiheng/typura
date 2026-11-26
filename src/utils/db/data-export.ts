import { db } from '.'

export type ProgressSnapshot = {
  /** 快照格式版本 */
  version: 1
  /** 快照对应的进度时间，用于判断哪一份更新 */
  updatedAt: number
  /** 浏览器本地设置与进度 */
  localStorageData: Record<string, string>
  /** IndexedDB 导出的数据 */
  dexieJson: string
}

const SNAPSHOT_VERSION = 1

export function collectLocalStorageData(): Record<string, string> {
  const data: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue
    const value = localStorage.getItem(key)
    if (value !== null) data[key] = value
  }
  return data
}

export function parseProgressSnapshot(value: unknown): ProgressSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined

  const snapshot = value as Partial<ProgressSnapshot>
  if (typeof snapshot.updatedAt !== 'number' || !Number.isFinite(snapshot.updatedAt)) return undefined
  if (!snapshot.localStorageData || typeof snapshot.localStorageData !== 'object') return undefined
  if (typeof snapshot.dexieJson !== 'string') return undefined

  const localStorageData: Record<string, string> = {}
  for (const [key, item] of Object.entries(snapshot.localStorageData)) {
    if (typeof item === 'string') localStorageData[key] = item
  }

  return {
    version: SNAPSHOT_VERSION,
    updatedAt: snapshot.updatedAt,
    localStorageData,
    dexieJson: snapshot.dexieJson,
  }
}

export async function createProgressSnapshot(updatedAt = Date.now()): Promise<ProgressSnapshot> {
  await import('dexie-export-import')

  const blob = await db.export()
  const dexieJson = await blob.text()

  return {
    version: SNAPSHOT_VERSION,
    updatedAt,
    localStorageData: collectLocalStorageData(),
    dexieJson,
  }
}

export async function applyProgressSnapshot(snapshot: ProgressSnapshot) {
  await import('dexie-export-import')

  const { dexieJson, localStorageData } = snapshot

  // 旧备份没有轮次状态，不能沿用导入前的排除/完成标记。
  if (!Object.hasOwn(localStorageData, 'masteryRounds')) localStorage.removeItem('masteryRounds')
  for (const [key, value] of Object.entries(localStorageData)) {
    localStorage.setItem(key, value)
  }

  if (dexieJson) {
    await db.import(new Blob([dexieJson]), {
      acceptVersionDiff: true,
      acceptMissingTables: true,
      acceptNameDiff: false,
      acceptChangedPrimaryKey: false,
      overwriteValues: true,
      clearTablesBeforeImport: true,
    })
  }
}
