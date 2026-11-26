import { db } from '.'
import type { ProgressSnapshot } from './data-export'
import { applyProgressSnapshot, createProgressSnapshot, parseProgressSnapshot } from './data-export'
import { decideProgressSync } from '@/utils/progressSync'

const LOCAL_UPDATED_AT_KEY = 'progressUpdatedAt'
const SYNC_PASSPHRASE_KEY = 'progressSyncPassphrase'
const PASS_PHRASE_MIN_LENGTH = 6
const PASS_PHRASE_SALT = 'typura-progress-snapshot-v1:'
const PROGRESS_KEYS = ['learnProgress', 'dictationProgress', 'wordStats', 'masteryRounds']

export type ProgressSyncResult =
  { status: 'uploaded'; updatedAt: number } | { status: 'restored'; updatedAt: number } | { status: 'conflict'; remoteUpdatedAt: number }

export type ProgressSyncResolution = 'keep-local' | 'keep-remote'

export function getStoredSyncPassphrase(): string {
  try {
    return window.localStorage.getItem(SYNC_PASSPHRASE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveSyncPassphrase(passphrase: string) {
  try {
    window.localStorage.setItem(SYNC_PASSPHRASE_KEY, passphrase)
  } catch (error) {
    console.error(error)
  }
}

export function normalizePassphrase(passphrase: string): string {
  return passphrase.trim()
}

export function isValidSyncPassphrase(passphrase: string): boolean {
  return normalizePassphrase(passphrase).length >= PASS_PHRASE_MIN_LENGTH
}

/** 记录本机进度最近一次变化的时间，用于判断同步方向。 */
export function markProgressUpdated(updatedAt = Date.now()) {
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

/** 本机是否已经有值得保留的练习进度。 */
export async function hasLocalProgress(): Promise<boolean> {
  try {
    const hasStoredProgress = PROGRESS_KEYS.some((key) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return false
      try {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0
        return Boolean(parsed)
      } catch {
        return raw.trim().length > 2
      }
    })
    if (hasStoredProgress) return true

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

async function uploadSnapshot(key: string, snapshot: ProgressSnapshot) {
  const payload = await encodeSnapshot(snapshot)
  const response = await fetch(`${getApiBase()}/api/progress/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, updatedAt: snapshot.updatedAt }),
  })
  if (!response.ok) throw new Error(`progress_upload_failed:${response.status}`)
}

async function uploadLocalProgress(key: string): Promise<ProgressSyncResult> {
  const snapshot = await createProgressSnapshot()
  await uploadSnapshot(key, snapshot)
  markProgressUpdated(snapshot.updatedAt)

  return { status: 'uploaded', updatedAt: snapshot.updatedAt }
}

async function restoreRemoteProgress(snapshot: ProgressSnapshot): Promise<ProgressSyncResult> {
  await applyProgressSnapshot(snapshot)
  markProgressUpdated(snapshot.updatedAt)

  return { status: 'restored', updatedAt: snapshot.updatedAt }
}

/**
 * 与云端同步进度：没有云端记录时上传，有冲突时按时间取较新的一份。
 * 本机没有时间标记时上交由调用方决定，避免误覆盖已有数据。
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

  const localUpdatedAt = getLocalProgressUpdatedAt()
  const localHasProgress = localUpdatedAt === undefined ? await hasLocalProgress() : true
  const decision = decideProgressSync({ remoteUpdatedAt: remote.updatedAt, localUpdatedAt, hasLocalProgress: localHasProgress })

  if (decision === 'upload') return uploadLocalProgress(key)
  if (decision === 'restore') return restoreRemoteProgress(remote)

  return { status: 'conflict', remoteUpdatedAt: remote.updatedAt }
}
