import Tooltip from '@/components/Tooltip'
import { hotkeysConfigAtom } from '@/store'
import type { HotkeyAction } from '@/utils/hotkeyBus'
import { emitHotkeyAction } from '@/utils/hotkeyBus'
import { formatShortcut } from '@/utils/hotkeys'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { Command } from 'lucide-react'

function ActionItem({
  label,
  keyLabel,
  action,
  close,
}: {
  label: string
  keyLabel?: string
  action: HotkeyAction
  close: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.currentTarget.blur()
        emitHotkeyAction(action)
        close()
      }}
      className="flex min-h-9 w-full items-center justify-between gap-4 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-soft)] focus:outline-none"
    >
      <span className="text-xs font-medium text-[var(--body)]">{label}</span>
      {keyLabel && (
        <kbd className="rounded border border-[var(--line-strong)] bg-[var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--muted)] uppercase">
          {keyLabel}
        </kbd>
      )}
    </button>
  )
}

export default function HotkeyFloatPanel() {
  const hotkeysConfig = useAtomValue(hotkeysConfigAtom)

  return (
    <Popover className="relative z-30 inline-flex items-center">
      <Tooltip content="快捷操作说明" placement="bottom">
        <PopoverButton className="icon-button outline-none focus:outline-none focus-visible:outline-none focus:ring-0" aria-label="快捷操作说明">
          <Command className="h-[18px] w-[18px]" />
        </PopoverButton>
      </Tooltip>

      <Transition
        enter="transition duration-150 ease-out"
        enterFrom="translate-y-1 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="transition duration-100 ease-in"
        leaveFrom="translate-y-0 opacity-100"
        leaveTo="translate-y-1 opacity-0"
      >
        <PopoverPanel className="surface absolute top-full right-0 z-[210] mt-2 w-60 overflow-visible p-3 shadow-xl select-none sm:right-0 sm:left-auto sm:translate-x-0">
          {({ close }) => (
            <>
              <div className="flex items-center justify-between border-b border-[var(--line)] px-1 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-xs">
                  <Command className="h-3.5 w-3.5 text-[var(--muted)]" />
                  <span>快捷操作说明</span>
                </div>
              </div>

              <div className="mt-1.5 flex flex-col gap-0.5">
                <ActionItem
                  label="禅模式"
                  keyLabel={formatShortcut(hotkeysConfig.toggleZenMode)}
                  action="toggleZenMode"
                  close={close}
                />
                <ActionItem
                  label="拼写提示"
                  keyLabel={formatShortcut(hotkeysConfig.hint)}
                  action="hint"
                  close={close}
                />
                <ActionItem
                  label="播放 / 暂停"
                  keyLabel={formatShortcut(hotkeysConfig.playPause)}
                  action="playPause"
                  close={close}
                />
                <ActionItem
                  label="上一单词"
                  keyLabel={formatShortcut(hotkeysConfig.prevWord)}
                  action="prevWord"
                  close={close}
                />
                <ActionItem
                  label="下一单词"
                  keyLabel={formatShortcut(hotkeysConfig.nextWord)}
                  action="nextWord"
                  close={close}
                />
              </div>
            </>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}
