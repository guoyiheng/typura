import { atomWithStorage } from 'jotai/utils'

/** 已绑定的同步口令，空字符串表示未绑定。 */
export const syncPassphraseAtom = atomWithStorage('progressSyncPassphrase', '', undefined, { getOnInit: true })
