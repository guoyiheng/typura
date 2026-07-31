import { useEffect, useRef } from 'react'

export type HotkeyAction =
  | 'playPause'
  | 'playExample'
  | 'prevWord'
  | 'nextWord'
  | 'hint'
  | 'toggleDictation'
  | 'toggleTrans'
  | 'playPronunciation'
  | 'stopWordPronunciation'
  | 'toggleZenMode'

const EVENT_NAME = 'typura-hotkey-action'

export function emitHotkeyAction(action: HotkeyAction) {
  window.dispatchEvent(new CustomEvent<HotkeyAction>(EVENT_NAME, { detail: action }))
}

export function useHotkeyAction(action: HotkeyAction, handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const listener = (e: Event) => {
      if ((e as CustomEvent<HotkeyAction>).detail === action) {
        handlerRef.current()
      }
    }
    window.addEventListener(EVENT_NAME, listener)
    return () => window.removeEventListener(EVENT_NAME, listener)
  }, [action])
}
