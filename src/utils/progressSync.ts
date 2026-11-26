export type ProgressSyncDecision = 'upload' | 'restore' | 'conflict'

export type ProgressSyncState = {
  /** 云端快照的更新时间，没有云端数据时为空 */
  remoteUpdatedAt?: number
  /** 本机进度最近一次变化的时间，未知时为空 */
  localUpdatedAt?: number
  /** 本机是否已有练习进度 */
  hasLocalProgress: boolean
}

/**
 * 决定同步方向：云端没有数据时上传；两边都有时间标记时取较新的一份；
 * 本机没有时间标记但已有进度时交给用户选择，避免误覆盖。
 */
export function decideProgressSync({ remoteUpdatedAt, localUpdatedAt, hasLocalProgress }: ProgressSyncState): ProgressSyncDecision {
  if (remoteUpdatedAt === undefined) return 'upload'
  if (localUpdatedAt !== undefined) return localUpdatedAt >= remoteUpdatedAt ? 'upload' : 'restore'

  return hasLocalProgress ? 'conflict' : 'restore'
}
