import Tooltip from '@/components/Tooltip'
import { isMnemonicEnabledAtom, wordDictationConfigAtom } from '@/store'
import type { WordDictationType } from '@/typings'
import { useHotkeyAction } from '@/utils/hotkeyBus'
import { Listbox, Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { Fragment } from 'react'

const dictationModeOptions: { label: string; value: WordDictationType }[] = [
  { label: '全部隐藏', value: 'hideAll' },
  { label: '隐藏元音', value: 'hideVowel' },
  { label: '隐藏辅音', value: 'hideConsonant' },
  { label: '随机隐藏', value: 'randomHide' },
]

export default function WordDictationSwitcher() {
  const [dictationSettings, setDictationSettings] = useAtom(wordDictationConfigAtom)
  const [isMnemonicEnabled, setIsMnemonicEnabled] = useAtom(isMnemonicEnabledAtom)
  const selectedMode = dictationModeOptions.find((option) => option.value === dictationSettings.type) ?? dictationModeOptions[0]

  const setDictationEnabled = (isOpen: boolean) => {
    setDictationSettings((current) => ({
      ...current,
      isOpen,
      ...(isOpen
        ? {
            openBy: 'user' as const,
            isReadBefore: current.isReadBefore ?? true,
            isReadAfter: current.isReadAfter ?? true,
          }
        : {}),
    }))
  }

  const toggleDictation = () => {
    setDictationSettings((current) => ({
      ...current,
      isOpen: !current.isOpen,
      ...(!current.isOpen
        ? {
            openBy: 'user' as const,
            isReadBefore: current.isReadBefore ?? true,
            isReadAfter: current.isReadAfter ?? true,
          }
        : {}),
    }))
  }

  const setDictationMode = (value: WordDictationType) => {
    setDictationSettings((current) => ({ ...current, type: value }))
  }

  const setReadBefore = (isReadBefore: boolean) => {
    setDictationSettings((current) => ({ ...current, isReadBefore }))
  }

  const setReadAfter = (isReadAfter: boolean) => {
    setDictationSettings((current) => ({ ...current, isReadAfter }))
  }

  const setLearnReadBefore = (isLearnReadBefore: boolean) => {
    setDictationSettings((current) => ({ ...current, isLearnReadBefore }))
  }

  const setLearnReadAfter = (isLearnReadAfter: boolean) => {
    setDictationSettings((current) => ({ ...current, isLearnReadAfter }))
  }

  useHotkeyAction('toggleDictation', toggleDictation)

  return (
    <Popover className="relative z-30 inline-flex items-center">
      <Tooltip content="模式与发音设置" placement="bottom">
        <PopoverButton
          className={`icon-button ${dictationSettings.isOpen ? 'text-[var(--primary)]' : ''}`}
          aria-label="模式与发音设置"
        >
          {dictationSettings.isOpen ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
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
        <PopoverPanel className="surface absolute top-full right-0 z-[210] mt-2 w-72 overflow-visible p-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">默写练习</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{dictationSettings.isOpen ? '当前已开启默写' : '当前为学习模式'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dictationSettings.isOpen}
              aria-label="开启默写练习"
              data-state={dictationSettings.isOpen ? 'checked' : 'unchecked'}
              className="switch-root"
              onClick={() => setDictationEnabled(!dictationSettings.isOpen)}
            >
              <span aria-hidden="true" className="switch-thumb" />
            </button>
          </div>

          {dictationSettings.isOpen ? (
            <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">隐藏方式</label>
                <Listbox value={dictationSettings.type} onChange={setDictationMode}>
                  <div className="relative">
                    <Listbox.Button className="listbox-button w-full text-sm">
                      <span>{selectedMode.label}</span>
                      <span>
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition duration-100 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="listbox-options text-sm">
                        {dictationModeOptions.map((option) => (
                          <Listbox.Option key={option.value} value={option.value}>
                            {({ selected }) => (
                              <>
                                <span>{option.label}</span>
                                {selected && (
                                  <span className="listbox-options-icon">
                                    <Check className="h-4 w-4" />
                                  </span>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>

              {/* 默写前朗读开关 */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <p className="text-xs font-medium text-[var(--ink)]">默写前朗读</p>
                  <p className="text-[11px] text-[var(--muted)]">切换到新单词时自动播放单词发音</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dictationSettings.isReadBefore ?? true}
                  aria-label="默写前朗读"
                  data-state={(dictationSettings.isReadBefore ?? true) ? 'checked' : 'unchecked'}
                  className="switch-root"
                  onClick={() => setReadBefore(!(dictationSettings.isReadBefore ?? true))}
                >
                  <span aria-hidden="true" className="switch-thumb" />
                </button>
              </div>

              {/* 默写后朗读开关 */}
              <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3">
                <div>
                  <p className="text-xs font-medium text-[var(--ink)]">默写后朗读</p>
                  <p className="text-[11px] text-[var(--muted)]">拼写正确完成后播放单词和例句发音</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dictationSettings.isReadAfter ?? true}
                  aria-label="默写后朗读"
                  data-state={(dictationSettings.isReadAfter ?? true) ? 'checked' : 'unchecked'}
                  className="switch-root"
                  onClick={() => setReadAfter(!(dictationSettings.isReadAfter ?? true))}
                >
                  <span aria-hidden="true" className="switch-thumb" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
              {/* 学习前朗读开关 */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <p className="text-xs font-medium text-[var(--ink)]">学习前朗读</p>
                  <p className="text-[11px] text-[var(--muted)]">切换到新单词时自动播放单词发音</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dictationSettings.isLearnReadBefore ?? dictationSettings.isReadBefore ?? true}
                  aria-label="学习前朗读"
                  data-state={(dictationSettings.isLearnReadBefore ?? dictationSettings.isReadBefore ?? true) ? 'checked' : 'unchecked'}
                  className="switch-root"
                  onClick={() => setLearnReadBefore(!(dictationSettings.isLearnReadBefore ?? dictationSettings.isReadBefore ?? true))}
                >
                  <span aria-hidden="true" className="switch-thumb" />
                </button>
              </div>

              {/* 学习后朗读开关 */}
              <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3">
                <div>
                  <p className="text-xs font-medium text-[var(--ink)]">学习后朗读</p>
                  <p className="text-[11px] text-[var(--muted)]">拼写正确完成后播放单词和例句发音</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dictationSettings.isLearnReadAfter ?? dictationSettings.isReadAfter ?? true}
                  aria-label="学习后朗读"
                  data-state={(dictationSettings.isLearnReadAfter ?? dictationSettings.isReadAfter ?? true) ? 'checked' : 'unchecked'}
                  className="switch-root"
                  onClick={() => setLearnReadAfter(!(dictationSettings.isLearnReadAfter ?? dictationSettings.isReadAfter ?? true))}
                >
                  <span aria-hidden="true" className="switch-thumb" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
            <div>
              <p className="text-xs font-medium text-[var(--ink)]">助记信息</p>
              <p className="text-[11px] text-[var(--muted)]">显示易混单词、词根来源和核心画面</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isMnemonicEnabled}
              aria-label="助记信息"
              data-state={isMnemonicEnabled ? 'checked' : 'unchecked'}
              className="switch-root"
              onClick={() => setIsMnemonicEnabled((current) => !current)}
            >
              <span aria-hidden="true" className="switch-thumb" />
            </button>
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}
