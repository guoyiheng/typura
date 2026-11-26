import { db } from '.'
import type { ProgressSnapshot } from './data-export'
import { applyProgressSnapshot, createProgressSnapshot, parseProgressSnapshot } from './data-export'
import { decideProgressSync } from '@/utils/progressSync'

const LOCAL_UPDATED_AT_KEY = 'progressUpdatedAt'
const SYNC_PASSPHRASE_KEY = 'progressSyncPassphrase'
const PASS_PHRASE_MIN_LENGTH = 6
const PASS_PHRASE_SALT = 'typura-progress-snapshot-v1:'
const PROGRESS_MAP_KEYS = ['learnProgress', 'dictationProgress']
const WORDBOOK_KEY = 'wordbook'
const WORD_STATS_KEY = 'wordStats'
/** 进度变化后延迟上传，避免连续输入时频繁请求。 */
const AUTO_UPLOAD_DEBOUNCE_MS = 3000
/** 两次自动上传的最小间隔。 */
const AUTO_UPLOAD_MIN_INTERVAL_MS = 10000
/** 页面关闭前尽量用 keepalive 请求把数据送出去，请求体上限约 64KB。 */
const KEEPALIVE_PAYLOAD_LIMIT = 60 * 1024

export type ProgressSyncResult =
  { status: 'uploaded'; updatedAt: number } | { status: 'restored'; updatedAt: number } | { status: 'conflict'; remoteUpdatedAt: number }

export type ProgressSyncResolution = 'keep-local' | 'keep-remote'

export type PullProgressResult = 'restored' | 'uploaded' | 'up-to-date'

let autoSyncPassphrase: string | undefined
let autoSyncKey: string | undefined
let autoUploadTimer: ReturnType<typeof setTimeout> | undefined
let lastAutoUploadAt = 0
let isAutoUploading = false
let isPullingRemote = false
let hasUnsyncedProgress = false

export function normalizePassphrase(passphrase: string): string {
  return passphrase.trim()
}

export function isValidSyncPassphrase(passphrase: string): boolean {
  return normalizePassphrase(passphrase).length >= PASS_PHRASE_MIN_LENGTH
}

function writeLocalProgressUpdatedAt(updatedAt: number) {
  try {
    window.localStorage.setItem(LOCAL_UPDATED_AT_KEY, String(updatedAt))
  } catch (error) {
    console.error(error)
  }
}

export function getLocalProgressUpdatedAt(): number | undefined {
  try {
    const value = Number(window.localStorage.getItem(LOCAL_UPDATED_AT_KEY))
    return Number.isFinite(value) && value > 0 ? value : undefined
  } catch {
    return undefined
  }
}

function readStoredValue(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

/**
 * 本机是否有真实的进度或数据（练习记录、单词统计、生词本）。
 * 页面初始化时写入的默认进度不算，避免新设备覆盖云端进度。
 */
export async function hasMeaningfulLocalProgress(): Promise<boolean> {
  try {
    for (const key of PROGRESS_MAP_KEYS) {
      const value = readStoredValue(key)
      if (!value || typeof value !== 'object') continue
      const hasPosition = Object.values(value as Record<string, { chapter?: number; index?: number } | undefined>).some(
        (item) => (item?.chapter ?? 0) > 0 || (item?.index ?? 0) > 0,
      )
      if (hasPosition) return true
    }

    const wordStats = readStoredValue(WORD_STATS_KEY)
    if (wordStats && typeof wordStats === 'object' && Object.keys(wordStats).length > 0) return true

    const wordbook = readStoredValue(WORDBOOK_KEY)
    if (Array.isArray(wordbook) && wordbook.length > 0) return true

    return (await db.wordRecords.count()) > 0
  } catch (error) {
    console.error(error)
    return false
  }
}

async function getSyncKey(passphrase: string): Promise<string> {
  const data = new TextEncoder().encode(`${PASS_PHRASE_SALT}${normalizePassphrase(passphrase)}`)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getApiBase(): string {
  return (import.meta.env.VITE_WORD_API_BASE?.trim() || '').replace(/\/+$/, '')
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function encodeSnapshot(snapshot: ProgressSnapshot): Promise<string> {
  const { gzip } = await import('pako')
  return bytesToBase64(gzip(JSON.stringify(snapshot)))
}

async function decodeSnapshot(payload: string): Promise<ProgressSnapshot> {
  const { ungzip } = await import('pako')
  const parsed: unknown = JSON.parse(ungzip(base64ToBytes(payload), { toText: true }))
  const snapshot = parseProgressSnapshot(parsed)
  if (!snapshot) throw new Error('invalid_snapshot')
  return snapshot
}

async function fetchRemoteSnapshot(key: string): Promise<ProgressSnapshot | undefined> {
  const response = await fetch(`${getApiBase()}/api/progress/${key}`, { cache: 'no-store' })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`progress_fetch_failed:${response.status}`)

  const data = (await response.json()) as { payload?: unknown }
  if (typeof data.payload !== 'string') throw new Error('progress_fetch_invalid')

  return decodeSnapshot(data.payload)
}

async function uploadSnapshot(key: string, snapshot: ProgressSnapshot, keepalive = false) {
  const payload = await encodeSnapshot(snapshot)
  const response = await fetch(`${getApiBase()}/api/progress/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, updatedAt: snapshot.updatedAt }),
    keepalive: keepalive && payload.length <= KEEPALIVE_PAYLOAD_LIMIT,
  })
  if (!response.ok) throw new Error(`progress_upload_failed:${response.status}`)
}

function createLocalSnapshot() {
  // 口令本身只留在本机，不随快照上云。
  return createProgressSnapshot({ excludeKeys: [SYNC_PASSPHRASE_KEY] })
}

async function uploadLocalProgress(key: string, keepalive = false): Promise<ProgressSyncResult> {
  const snapshot = await createLocalSnapshot()
  await uploadSnapshot(key, snapshot, keepalive)
  writeLocalProgressUpdatedAt(snapshot.updatedAt)
  hasUnsyncedProgress = false

  return { status: 'uploaded', updatedAt: snapshot.updatedAt }
}

async function restoreRemoteProgress(snapshot: ProgressSnapshot): Promise<ProgressSyncResult> {
  await applyProgressSnapshot(snapshot)
  writeLocalProgressUpdatedAt(snapshot.updatedAt)
  hasUnsyncedProgress = false

  return { status: 'restored', updatedAt: snapshot.updatedAt }
}

/** 绑定口令后开始自动同步。 */
export function startAutoSync(passphrase: string) {
  const normalized = normalizePassphrase(passphrase)
  if (normalized === autoSyncPassphrase) return

  autoSyncPassphrase = normalized
  autoSyncKey = undefined
  void getSyncKey(normalized)
    .then((key) => {
      if (autoSyncPassphrase === normalized) autoSyncKey = key
    })
    .catch(console.error)
}

export function stopAutoSync() {
  autoSyncPassphrase = undefined
  autoSyncKey = undefined
  if (autoUploadTimer) {
    clearTimeout(autoUploadTimer)
    autoUploadTimer = undefined
  }
}

function scheduleAutoUpload(delay = AUTO_UPLOAD_DEBOUNCE_MS) {
  if (!autoSyncPassphrase) return

  if (autoUploadTimer) clearTimeout(autoUploadTimer)
  const wait = Math.max(delay, AUTO_UPLOAD_MIN_INTERVAL_MS - (Date.now() - lastAutoUploadAt))
  autoUploadTimer = setTimeout(() => {
    autoUploadTimer = undefined
    if (isPullingRemote) {
      scheduleAutoUpload(AUTO_UPLOAD_MIN_INTERVAL_MS)
      return
    }
    void uploadPendingProgress()
  }, wait)
}

async function uploadPendingProgress(keepalive = false): Promise<boolean> {
  const passphrase = autoSyncPassphrase
  if (!passphrase || isAutoUploading || !hasUnsyncedProgress) return false

  isAutoUploading = true
  try {
    const key = autoSyncKey ?? (await getSyncKey(passphrase))
    autoSyncKey = key

    const snapshot = await createLocalSnapshot()
    await uploadSnapshot(key, snapshot, keepalive)
    writeLocalProgressUpdatedAt(snapshot.updatedAt)
    hasUnsyncedProgress = false
    lastAutoUploadAt = Date.now()

    return true
  } catch (error) {
    console.error(error)
    return false
  } finally {
    isAutoUploading = false
    if (hasUnsyncedProgress && autoSyncPassphrase) scheduleAutoUpload(AUTO_UPLOAD_MIN_INTERVAL_MS)
  }
}

/** 记录本机进度变化，绑定口令后会自动排队上传。 */
export function markProgressUpdated(updatedAt = Date.now()) {
  writeLocalProgressUpdatedAt(updatedAt)
  hasUnsyncedProgress = true
  scheduleAutoUpload()
}

/** 立即把当前进度上传到云端（关闭页面前也会调用）。 */
export async function flushProgressUpload(keepalive = false): Promise<boolean> {
  if (!autoSyncPassphrase || !hasUnsyncedProgress) return false

  if (autoUploadTimer) {
    clearTimeout(autoUploadTimer)
    autoUploadTimer = undefined
  }

  return uploadPendingProgress(keepalive)
}

/**
 * 拉取云端进度：云端更新时恢复，云端没有数据时上传本机进度。
 * 本机没有时间标记但已有进度时不会自动覆盖，交由设置页决定。
 */
export async function pullLatestProgress(passphrase: string): Promise<PullProgressResult> {
  isPullingRemote = true
  try {
    return await pullLatestProgressWithKey(await getSyncKey(passphrase))
  } finally {
    isPullingRemote = false
    if (hasUnsyncedProgress && autoSyncPassphrase) scheduleAutoUpload(AUTO_UPLOAD_MIN_INTERVAL_MS)
  }
}

async function pullLatestProgressWithKey(key: string): Promise<PullProgressResult> {
  const remote = await fetchRemoteSnapshot(key)

  const localHasProgress = await hasMeaningfulLocalProgress()

  if (!remote) {
    if (!localHasProgress) return 'up-to-date'
    const result = await uploadLocalProgress(key)
    return result.status === 'uploaded' ? 'uploaded' : 'up-to-date'
  }

  // 本机没有真实进度（例如新设备）时直接使用云端进度。
  if (!localHasProgress) {
    await restoreRemoteProgress(remote)
    return 'restored'
  }

  const localUpdatedAt = getLocalProgressUpdatedAt()
  if (localUpdatedAt === undefined || remote.updatedAt > localUpdatedAt) {
    await restoreRemoteProgress(remote)
    return 'restored'
  }

  return 'up-to-date'
}

/**
 * 手动同步：绑定口令时使用，没有云端记录时上传，有冲突时按时间取较新的一份。
 */
export async function syncProgress(passphrase: string, resolution?: ProgressSyncResolution): Promise<ProgressSyncResult> {
  const key = await getSyncKey(passphrase)
  const remote = await fetchRemoteSnapshot(key)

  if (resolution === 'keep-remote') {
    if (!remote) throw new Error('missing_remote_progress')
    return restoreRemoteProgress(remote)
  }

  if (resolution === 'keep-local' || !remote) {
    return uploadLocalProgress(key)
  }

  const decision = decideProgressSync({
    remoteUpdatedAt: remote.updatedAt,
    localUpdatedAt: getLocalProgressUpdatedAt(),
    hasLocalProgress: await hasMeaningfulLocalProgress(),
  })

  if (decision === 'upload') return uploadLocalProgress(key)
  if (decision === 'restore') return restoreRemoteProgress(remote)

  return { status: 'conflict', remoteUpdatedAt: remote.updatedAt }
}
