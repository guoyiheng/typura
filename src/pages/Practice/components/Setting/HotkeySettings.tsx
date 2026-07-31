import Tooltip from '@/components/Tooltip'
import { hotkeysConfigAtom } from '@/store'
import {
  defaultHotkeysConfig,
  formatShortcut,
  getShortcutFromEvent,
  hotkeyDefinitions,
  isModifierKey,
  isUnsafeShortcut,
  shortcutHasAlternative,
} from '@/utils/hotkeys'
import type { ConfigurableHotkeyAction, HotkeysConfig } from '@/utils/hotkeys'
import { useAtom } from 'jotai'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

function HotkeyRecorder({
  action,
  error,
  onChange,
  onError,
  onReset,
  shortcut,
}: {
  action: ConfigurableHotkeyAction
  error?: string
  onChange: (shortcut: string) => void
  onError: (message?: string) => void
  onReset: () => void
  shortcut: string
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [pendingModifier, setPendingModifier] = useState<string>()

  const finishRecording = (nextShortcut: string) => {
    if (isUnsafeShortcut(nextShortcut)) {
      onError('该按键会干扰正常拼写，请搭配 Ctrl、Alt 或 Command。')
      setPendingModifier(undefined)
      return
    }

    onChange(nextShortcut)
    setPendingModifier(undefined)
    setIsRecording(false)
  }

  const cancelRecording = () => {
    setPendingModifier(undefined)
    setIsRecording(false)
    onError(undefined)
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-hotkey-recorder="true"
          aria-label={`设置${hotkeyDefinitions.find((item) => item.action === action)?.label ?? ''}快捷键`}
          aria-pressed={isRecording}
          className={`flex h-10 min-w-32 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors outline-none sm:min-w-40 ${
            isRecording
              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
              : 'border-[var(--line-strong)] bg-[var(--surface)] text-[var(--body)] hover:bg-[var(--surface-soft)]'
          }`}
          onClick={() => {
            setIsRecording(true)
            setPendingModifier(undefined)
            onError(undefined)
          }}
          onBlur={() => {
            if (isRecording) cancelRecording()
          }}
          onKeyDown={(event) => {
            if (!isRecording) return
            event.preventDefault()
            event.stopPropagation()

            if (event.key === 'Escape') {
              cancelRecording()
              return
            }

            const nextShortcut = getShortcutFromEvent(event.nativeEvent)
            if (isModifierKey(event.nativeEvent)) {
              setPendingModifier(nextShortcut)
              return
            }

            finishRecording(nextShortcut)
          }}
          onKeyUp={(event) => {
            if (!isRecording || !pendingModifier || !isModifierKey(event.nativeEvent)) return
            event.preventDefault()
            event.stopPropagation()
            finishRecording(pendingModifier)
          }}
        >
          <kbd className="font-mono tracking-normal">
            {isRecording ? (pendingModifier ? formatShortcut(pendingModifier) : '按下按键') : formatShortcut(shortcut)}
          </kbd>
        </button>

        <Tooltip content="恢复默认">
          <button
            type="button"
            className="icon-button h-9 w-9 flex-[0_0_36px]"
            onClick={onReset}
            aria-label="恢复默认快捷键"
            disabled={shortcut === defaultHotkeysConfig[action]}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
      {error && <span className="max-w-52 text-right text-[11px] leading-4 text-[var(--danger)]">{error}</span>}
    </div>
  )
}

export default function HotkeySettings() {
  const [hotkeys, setHotkeys] = useAtom(hotkeysConfigAtom)
  const [errors, setErrors] = useState<Partial<Record<ConfigurableHotkeyAction, string>>>({})

  const setError = (action: ConfigurableHotkeyAction, message?: string) => {
    setErrors((current) => ({ ...current, [action]: message }))
  }

  const updateShortcut = (action: ConfigurableHotkeyAction, shortcut: string) => {
    const conflict = hotkeyDefinitions.find((item) => item.action !== action && shortcutHasAlternative(hotkeys[item.action], shortcut))

    if (conflict) {
      setError(action, `与“${conflict.label}”重复。`)
      return
    }

    setHotkeys((current) => ({ ...current, [action]: shortcut }))
    setError(action, undefined)
  }

  const resetShortcut = (action: ConfigurableHotkeyAction) => updateShortcut(action, defaultHotkeysConfig[action])

  const resetAll = () => {
    setHotkeys(defaultHotkeysConfig as HotkeysConfig)
    setErrors({})
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex justify-end border-b border-[var(--line)] pb-3">
        <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={resetAll}>
          <RotateCcw className="h-3.5 w-3.5" />
          全部恢复默认
        </button>
      </div>

      <div className="flex flex-col divide-y divide-[var(--line)]">
        {hotkeyDefinitions.map(({ action, description, label }) => (
          <div key={action} className="flex min-h-[76px] flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--body)]">{label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
            </div>
            <HotkeyRecorder
              action={action}
              shortcut={hotkeys[action]}
              error={errors[action]}
              onChange={(shortcut) => updateShortcut(action, shortcut)}
              onError={(message) => setError(action, message)}
              onReset={() => resetShortcut(action)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
