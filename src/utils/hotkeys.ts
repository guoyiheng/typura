export const hotkeyDefinitions = [
  { action: 'toggleZenMode', label: '禅模式', description: '切换沉浸练习视图。', defaultShortcut: '0' },
  { action: 'playPause', label: '播放 / 暂停', description: '控制当前单词或例句的朗读。', defaultShortcut: '1' },
  { action: 'hint', label: '拼写提示', description: '逐次显示当前单词的后续字符。', defaultShortcut: '2' },
  { action: 'addToWordbook', label: '生词本', description: '将当前单词加入或移出生词本。', defaultShortcut: '3' },
  { action: 'prevWord', label: '上一单词', description: '返回本章的上一个单词。', defaultShortcut: 'left,up' },
  { action: 'nextWord', label: '下一单词', description: '前往本章的下一个单词。', defaultShortcut: 'right,down' },
] as const

export type ConfigurableHotkeyAction = (typeof hotkeyDefinitions)[number]['action']
export type HotkeysConfig = Record<ConfigurableHotkeyAction, string>

export const defaultHotkeysConfig = Object.fromEntries(
  hotkeyDefinitions.map(({ action, defaultShortcut }) => [action, defaultShortcut]),
) as HotkeysConfig

/** 旧版本内置的默认快捷键，仅用于一次性升级用户的旧配置。 */
const legacyDefaultShortcuts: Partial<Record<ConfigurableHotkeyAction, string>> = {
  toggleZenMode: 'backquote',
  playPause: 'ctrl',
  hint: 'tab',
}

const HOTKEYS_CONFIG_STORAGE_KEY = 'hotkeysConfig'
const HOTKEYS_CONFIG_VERSION_KEY = 'hotkeysConfigVersion'
const HOTKEYS_CONFIG_VERSION = 2

/** 补齐缺失的快捷键项。 */
export function normalizeHotkeysConfig(config: Partial<HotkeysConfig> | null | undefined): HotkeysConfig {
  const next = { ...defaultHotkeysConfig }
  if (!config) return next

  for (const action of Object.keys(defaultHotkeysConfig) as ConfigurableHotkeyAction[]) {
    const shortcut = config[action]
    if (typeof shortcut !== 'string' || !shortcut) continue
    next[action] = shortcut
  }

  return next
}

/**
 * 把旧版本遗留的默认快捷键一次性升级为新默认值，用户自行设置过的按键保持不变。
 */
export function migrateHotkeysConfigStorage() {
  try {
    const storedVersion = Number(window.localStorage.getItem(HOTKEYS_CONFIG_VERSION_KEY) ?? 0)
    const rawConfig = window.localStorage.getItem(HOTKEYS_CONFIG_STORAGE_KEY)

    if (storedVersion < HOTKEYS_CONFIG_VERSION) {
      const config = normalizeHotkeysConfig(rawConfig ? JSON.parse(rawConfig) : undefined)

      for (const action of Object.keys(legacyDefaultShortcuts) as ConfigurableHotkeyAction[]) {
        if (config[action] === legacyDefaultShortcuts[action]) {
          config[action] = defaultHotkeysConfig[action]
        }
      }

      window.localStorage.setItem(HOTKEYS_CONFIG_STORAGE_KEY, JSON.stringify(config))
    }

    window.localStorage.setItem(HOTKEYS_CONFIG_VERSION_KEY, String(HOTKEYS_CONFIG_VERSION))
  } catch (error) {
    console.error(error)
  }
}

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
  if (key === 'tab' || key === 'backquote' || /^\d$/.test(key) || (key.startsWith('f') && /^f\d{1,2}$/.test(key))) return false
  if (['left', 'right', 'up', 'down', 'home', 'end', 'pageup', 'pagedown'].includes(key)) return false

  return key.length === 1 || ['space', 'backspace', 'delete', 'enter'].includes(key)
}

export function shortcutHasAlternative(shortcut: string, alternative: string): boolean {
  return shortcut.split(',').includes(alternative)
}

export function isHotkeyRecorderEvent(event: KeyboardEvent): boolean {
  return event.target instanceof Element && Boolean(event.target.closest('[data-hotkey-recorder="true"]'))
}

/**
 * 判断快捷键事件是否发生在文本输入控件里。
 * 隐藏的练习输入框需要参与快捷键判断，因此单独放行。
 */
export function isEditableHotkeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[data-practice-input="true"]')) return false

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
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
