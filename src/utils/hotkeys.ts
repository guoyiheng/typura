export const hotkeyDefinitions = [
  { action: 'toggleZenMode', label: '禅模式', description: '切换沉浸练习视图。', defaultShortcut: 'backquote' },
  { action: 'hint', label: '拼写提示', description: '逐次显示当前单词的后续字符。', defaultShortcut: 'tab' },
  { action: 'playPause', label: '播放 / 暂停', description: '控制当前单词或例句的朗读。', defaultShortcut: 'ctrl' },
  { action: 'prevWord', label: '上一单词', description: '返回本章的上一个单词。', defaultShortcut: 'left,up' },
  { action: 'nextWord', label: '下一单词', description: '前往本章的下一个单词。', defaultShortcut: 'right,down' },
] as const

export type ConfigurableHotkeyAction = (typeof hotkeyDefinitions)[number]['action']
export type HotkeysConfig = Record<ConfigurableHotkeyAction, string>

export const defaultHotkeysConfig = Object.fromEntries(
  hotkeyDefinitions.map(({ action, defaultShortcut }) => [action, defaultShortcut]),
) as HotkeysConfig

const keyLabels: Record<string, string> = {
  alt: 'Alt',
  backquote: '~',
  backspace: 'Backspace',
  ctrl: 'Ctrl',
  delete: 'Delete',
  down: '↓',
  end: 'End',
  enter: 'Enter',
  esc: 'Esc',
  home: 'Home',
  left: '←',
  meta: '⌘',
  pagedown: 'Page Down',
  pageup: 'Page Up',
  right: '→',
  shift: 'Shift',
  space: 'Space',
  tab: 'Tab',
  up: '↑',
}

const modifierKeys = new Set(['ctrl', 'alt', 'shift', 'meta'])

function normalizeEventKey(event: KeyboardEvent): string {
  if (event.code === 'Backquote') return 'backquote'

  const aliases: Record<string, string> = {
    ' ': 'space',
    Alt: 'alt',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    Control: 'ctrl',
    Escape: 'esc',
    Meta: 'meta',
    Shift: 'shift',
  }

  return aliases[event.key] ?? event.key.toLowerCase()
}

export function formatShortcut(shortcut: string): string {
  return shortcut
    .split(',')
    .map((alternative) =>
      alternative
        .split('+')
        .map((key) => keyLabels[key] ?? (key.length === 1 ? key.toUpperCase() : key))
        .join(' + '),
    )
    .join(' / ')
}

export function getShortcutFromEvent(event: KeyboardEvent): string {
  const key = normalizeEventKey(event)
  if (modifierKeys.has(key)) return key

  const modifiers = [
    event.ctrlKey ? 'ctrl' : '',
    event.altKey ? 'alt' : '',
    event.shiftKey && key !== 'backquote' ? 'shift' : '',
    event.metaKey ? 'meta' : '',
  ].filter(Boolean)

  return [...modifiers, key].join('+')
}

export function isModifierKey(event: KeyboardEvent): boolean {
  return modifierKeys.has(normalizeEventKey(event))
}

export function isUnsafeShortcut(shortcut: string): boolean {
  const parts = shortcut.split('+')
  const key = parts.at(-1) ?? ''
  const hasCommandModifier = parts.some((part) => part === 'ctrl' || part === 'alt' || part === 'meta')

  if (shortcut === 'shift' || shortcut === 'alt' || shortcut === 'meta') return true
  if (key === 'dead' || key === 'unidentified' || key === ',' || key === '+') return true
  if (hasCommandModifier) return false
  if (key === 'tab' || key === 'backquote' || (key.startsWith('f') && /^f\d{1,2}$/.test(key))) return false
  if (['left', 'right', 'up', 'down', 'home', 'end', 'pageup', 'pagedown'].includes(key)) return false

  return key.length === 1 || ['space', 'backspace', 'delete', 'enter'].includes(key)
}

export function shortcutHasAlternative(shortcut: string, alternative: string): boolean {
  return shortcut.split(',').includes(alternative)
}

export function isHotkeyRecorderEvent(event: KeyboardEvent): boolean {
  return event.target instanceof Element && Boolean(event.target.closest('[data-hotkey-recorder="true"]'))
}

export function eventMatchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const eventKey = normalizeEventKey(event)

  return shortcut.split(',').some((alternative) => {
    const parts = alternative.split('+')
    const expectedKey = parts.at(-1)
    if (expectedKey !== eventKey) return false

    const expectedModifiers = new Set(parts.slice(0, -1))
    const actualModifiers = {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
    }

    if (modifierKeys.has(eventKey)) {
      actualModifiers[eventKey as keyof typeof actualModifiers] = false
    }

    return Object.entries(actualModifiers).every(([modifier, pressed]) => {
      if (expectedKey === 'backquote' && modifier === 'shift' && !expectedModifiers.has('shift')) return true
      return pressed === expectedModifiers.has(modifier)
    })
  })
}
