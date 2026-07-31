import { PracticeActionType, PracticeContext } from '../../store'
import HotkeySettings from './HotkeySettings'
import styles from './index.module.css'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CHAPTER_LENGTH } from '@/constants'
import { LANG_PRON_MAP, keySoundResources } from '@/resources/soundResource'
import {
  chapterLengthConfigAtom,
  currentChapterAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  dictationProgressAtom,
  hintSoundsConfigAtom,
  isIgnoreCaseAtom,
  isShowAnswerOnHoverAtom,
  keySoundsConfigAtom,
  learnProgressAtom,
  loopWordConfigAtom,
  pronunciationConfigAtom,
  randomConfigAtom,
  restartOnWrongAtom,
} from '@/store'
import type { PronunciationType, SoundResource } from '@/typings'
import { getDictionaryChapterLength, hasDictionaryPresetChapters, toFixedNumber } from '@/utils'
import type { ExportProgress, ImportProgress } from '@/utils/db/data-export'
import { exportDatabase, importDatabase } from '@/utils/db/data-export'
import { playKeySoundResource } from '@/utils/sounds/keySounds'
import { Listbox, Switch, Transition } from '@headlessui/react'
import * as Progress from '@radix-ui/react-progress'
import * as RadioGroup from '@radix-ui/react-radio-group'
import * as Slider from '@radix-ui/react-slider'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  Command,
  Database,
  Download,
  Ear,
  Keyboard,
  ListFilter,
  Repeat,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  Volume2,
} from 'lucide-react'
import { Fragment, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const navItems = [
  { id: 'sec-flow', label: '练习流程', icon: ListFilter },
  { id: 'sec-input', label: '输入与提示', icon: SlidersHorizontal },
  { id: 'sec-hotkeys', label: '快捷键', icon: Command },
  { id: 'sec-repeat', label: '重复规则', icon: Repeat },
  { id: 'sec-pronunciation', label: '发音与朗读', icon: Volume2 },
  { id: 'sec-key-sound', label: '按键音效', icon: Keyboard },
  { id: 'sec-feedback-sound', label: '反馈音效', icon: Bell },
  { id: 'sec-reset', label: '重置进度', icon: RotateCcw },
  { id: 'sec-backup', label: '备份与恢复', icon: Database },
]

function ToggleSetting({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className={styles.settingRow}>
      <div className={styles.rowCopy}>
        <span className={styles.blockLabel}>{label}</span>
        <span className={styles.rowDescription}>{description}</span>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} className="switch-root" aria-label={label}>
        <span aria-hidden="true" className="switch-thumb" />
      </Switch>
    </div>
  )
}

const ToggleControl = ToggleSetting

function SoundSlider({
  disabled,
  label,
  max,
  min = 0,
  onChange,
  step,
  value,
  valueLabel,
}: {
  disabled?: boolean
  label: string
  max: number
  min?: number
  onChange: (value: [number]) => void
  step: number
  value: number
  valueLabel: string
}) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderHeader}>
        <span className={styles.blockLabel}>{label}</span>
        <span className={styles.valueLabel}>{valueLabel}</span>
      </div>
      <Slider.Root value={[value]} min={min} max={max} step={step} className="slider" onValueChange={onChange} disabled={disabled}>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumb aria-label={label} />
      </Slider.Root>
    </div>
  )
}

function SectionContainer({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode
  description: string
  id: string
  title: string
}) {
  return (
    <section id={id} className={`${styles.section} scroll-mt-4`}>
      <header>
        <h3 className={styles.sectionLabel}>{title}</h3>
        <p className={styles.sectionDescription}>{description}</p>
      </header>
      {children}
    </section>
  )
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex w-full items-center gap-3">
      <Progress.Root className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]" value={value} aria-label={label}>
        <Progress.Indicator
          className="h-full w-full bg-[var(--primary)] transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${100 - value}%)` }}
        />
      </Progress.Root>
      <span className="w-10 text-right text-xs font-semibold text-[var(--muted)] tabular-nums">{value}%</span>
    </div>
  )
}

function DataAction({
  action,
  children,
  description,
  title,
}: {
  action: ReactNode
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <div className="grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
        <div className="mt-4">{children}</div>
      </div>
      <div className="sm:pt-0.5">{action}</div>
    </div>
  )
}

export default function Setting({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeNavId, setActiveNavId] = useState(navItems[0].id)
  const practiceContext = useContext(PracticeContext)
  const practiceDispatch = practiceContext?.dispatch
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isClickScrollingRef = useRef(false)

  // Atoms State
  const [chapterLengthConfig, setChapterLengthConfig] = useAtom(chapterLengthConfigAtom)
  const [customChapterLength, setCustomChapterLength] = useState<string>(chapterLengthConfig.length.toString())
  const [randomConfig, setRandomConfig] = useAtom(randomConfigAtom)
  const [ignoreCase, setIgnoreCase] = useAtom(isIgnoreCaseAtom)
  const [showDictationHint, setShowDictationHint] = useAtom(isShowAnswerOnHoverAtom)
  const [restartAfterError, setRestartAfterError] = useAtom(restartOnWrongAtom)
  const [loopWordConfig, setLoopWordConfig] = useAtom(loopWordConfigAtom)
  const [pronunciation, setPronunciation] = useAtom(pronunciationConfigAtom)
  const [keySounds, setKeySounds] = useAtom(keySoundsConfigAtom)
  const [feedbackSounds, setFeedbackSounds] = useAtom(hintSoundsConfigAtom)

  // Data Reset & Backup State
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [learnResetComplete, setLearnResetComplete] = useState(false)
  const [dictationResetComplete, setDictationResetComplete] = useState(false)

  const currentDictionaryId = useAtomValue(currentDictIdAtom)
  const currentDictionary = useAtomValue(currentDictInfoAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const setLearnProgress = useSetAtom(learnProgressAtom)
  const setDictationProgress = useSetAtom(dictationProgressAtom)
  const hasPresetChapters = hasDictionaryPresetChapters(currentDictionary)
  const hasDefaultChapterLength =
    typeof currentDictionary.defaultChapterLength === 'number' &&
    Number.isInteger(currentDictionary.defaultChapterLength) &&
    currentDictionary.defaultChapterLength > 0
  const hasNativeChapters = hasPresetChapters || hasDefaultChapterLength
  const activeChapterLength = getDictionaryChapterLength(currentDictionary, chapterLengthConfig.length)

  const pronunciationOptions = useMemo(
    () => LANG_PRON_MAP[currentDictionary.language]?.pronunciation ?? [],
    [currentDictionary.language],
  )
  const selectedAccentLabel = useMemo(
    () => pronunciationOptions.find((option) => option.pron === pronunciation.type)?.name ?? '默认',
    [pronunciation.type, pronunciationOptions],
  )

  const updateOpenState = (open: boolean) => {
    onOpenChange(open)
  }

  useEffect(() => {
    if (open) practiceDispatch?.({ type: PracticeActionType.SET_IS_TYPING, payload: false })
  }, [open, practiceDispatch])

  // Scroll to section when nav clicked
  const scrollToSection = (id: string) => {
    isClickScrollingRef.current = true
    setActiveNavId(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setTimeout(() => {
      isClickScrollingRef.current = false
    }, 600)
  }

  // Handle scroll event on right panel to update active nav item
  const handleScroll = useCallback(() => {
    if (isClickScrollingRef.current) return
    const container = scrollContainerRef.current
    if (!container) return

    const containerTop = container.getBoundingClientRect().top
    const sections = navItems.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[]

    let currentActiveId = navItems[0].id

    for (const section of sections) {
      const rect = section.getBoundingClientRect()
      // If section top is near or above container top plus offset (100px)
      if (rect.top - containerTop <= 110) {
        currentActiveId = section.id
      } else {
        break
      }
    }

    setActiveNavId(currentActiveId)
  }, [])

  useEffect(() => {
    setCustomChapterLength(activeChapterLength.toString())
  }, [activeChapterLength])

  const handleCustomChapterLengthSubmit = useCallback(() => {
    if (hasNativeChapters) return
    const parsed = Number.parseInt(customChapterLength, 10)
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 10000) {
      if (parsed !== chapterLengthConfig.length) {
        setChapterLengthConfig({ length: parsed })
        setCurrentChapter(0)
      }
    } else {
      setCustomChapterLength(chapterLengthConfig.length.toString())
    }
  }, [chapterLengthConfig.length, customChapterLength, hasNativeChapters, setChapterLengthConfig, setCurrentChapter])

  // Handlers
  const setRandomOrder = useCallback(
    (checked: boolean) => setRandomConfig((current) => ({ ...current, isOpen: checked })),
    [setRandomConfig],
  )
  const setLoopCount = useCallback(
    (value: string) => {
      const parsedValue = Number.parseInt(value, 10)
      setLoopWordConfig((current) => ({
        ...current,
        times: Number.isNaN(parsedValue) ? Number.MAX_SAFE_INTEGER : parsedValue,
      }))
    },
    [setLoopWordConfig],
  )

  const setWordVolume = useCallback(
    (value: [number]) => setPronunciation((current) => ({ ...current, volume: value[0] / 100 })),
    [setPronunciation],
  )
  const setPronunciationRate = useCallback(
    (value: [number]) => setPronunciation((current) => ({ ...current, rate: value[0] })),
    [setPronunciation],
  )
  const setPronunciationType = useCallback(
    (value: PronunciationType) => setPronunciation((current) => ({ ...current, type: value })),
    [setPronunciation],
  )

  const setKeySoundsEnabled = useCallback(
    (checked: boolean) => setKeySounds((current) => ({ ...current, isOpen: checked })),
    [setKeySounds],
  )
  const setKeySoundVolume = useCallback(
    (value: [number]) => setKeySounds((current) => ({ ...current, volume: value[0] / 100 })),
    [setKeySounds],
  )
  const setKeySoundResource = useCallback(
    (key: string) => {
      const resource = keySoundResources.find((item) => item.key === key)
      if (resource) setKeySounds((current) => ({ ...current, resource }))
    },
    [setKeySounds],
  )
  const previewKeySound = useCallback((resource: SoundResource) => {
    playKeySoundResource(resource)
  }, [])

  const setFeedbackSoundsEnabled = useCallback(
    (checked: boolean) => setFeedbackSounds((current) => ({ ...current, isOpen: checked })),
    [setFeedbackSounds],
  )
  const setFeedbackSoundVolume = useCallback(
    (value: [number]) => setFeedbackSounds((current) => ({ ...current, volume: value[0] / 100 })),
    [setFeedbackSounds],
  )

  const resetLearnProgress = useCallback(() => {
    setLearnProgress((current) => {
      const nextProgress = { ...current }
      delete nextProgress[currentDictionaryId]
      return nextProgress
    })
    setCurrentChapter(0)
    setLearnResetComplete(true)
    setTimeout(() => setLearnResetComplete(false), 2000)
  }, [currentDictionaryId, setCurrentChapter, setLearnProgress])

  const resetDictationProgress = useCallback(() => {
    setDictationProgress((current) => {
      const nextProgress = { ...current }
      delete nextProgress[currentDictionaryId]
      return nextProgress
    })
    setCurrentChapter(0)
    setDictationResetComplete(true)
    setTimeout(() => setDictationResetComplete(false), 2000)
  }, [currentDictionaryId, setCurrentChapter, setDictationProgress])

  const updateExportProgress = useCallback(({ totalRows, completedRows, done }: ExportProgress) => {
    if (done) {
      setIsExporting(false)
      setExportProgress(100)
      return true
    }
    if (totalRows) setExportProgress(Math.floor((completedRows / totalRows) * 100))
    return true
  }, [])

  const exportData = useCallback(() => {
    setExportProgress(0)
    setIsExporting(true)
    exportDatabase(updateExportProgress)
  }, [updateExportProgress])

  const updateImportProgress = useCallback(({ totalRows, completedRows, done }: ImportProgress) => {
    if (done) {
      setIsImporting(false)
      setImportProgress(100)
      return true
    }
    if (totalRows) setImportProgress(Math.floor((completedRows / totalRows) * 100))
    return true
  }, [])

  const beginImport = useCallback(() => {
    setImportProgress(0)
    setIsImporting(true)
  }, [])

  const importData = useCallback(() => {
    importDatabase(beginImport, updateImportProgress)
  }, [beginImport, updateImportProgress])

  return (
    <Dialog open={open} onOpenChange={updateOpenState}>
      <DialogContent className="settings-dialog flex h-[min(680px,calc(100vh-2rem))] w-[calc(100%-2rem)] max-w-[960px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="settings-header shrink-0 border-b border-[var(--line)] px-5 py-4 pr-14 text-left sm:px-6">
          <DialogTitle className="text-2xl">设置</DialogTitle>
          <DialogDescription className="mt-1 text-xs">调整当前设备上的练习体验与数据偏好</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* SIDEBAR ANCHOR NAV */}
          <nav aria-label="设置目录导航" className="settings-sidebar customized-scrollbar flex h-auto w-full shrink-0 flex-row overflow-x-auto border-b p-1.5 sm:w-56 sm:flex-col sm:justify-start sm:overflow-y-auto sm:border-r sm:border-b-0 sm:p-2">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeNavId === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`settings-tab flex min-h-10 min-w-0 shrink-0 items-center justify-start gap-2.5 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    isActive
                      ? 'active bg-[var(--primary-soft)] text-[var(--primary)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`} />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              )
            })}
          </nav>

          {/* INTEGRATED SINGLE-PAGE SCROLL CONTENT WITH REALTIME ON-SCROLL SYNC */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="customized-scrollbar flex-1 overflow-y-auto select-none"
          >
            <div className={styles.tabContent}>
              {/* 1. 练习流程 */}
              <SectionContainer id="sec-flow" title="练习流程" description="控制章节划分、顺序与练习时显示的上下文。">
                <div className={styles.settingList}>
                  <ToggleSetting
                    checked={randomConfig.isOpen}
                    onChange={setRandomOrder}
                    label="章节内随机排序"
                    description="新章节开始时打乱其中的单词顺序。"
                  />

                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <div className="mb-1 text-sm font-semibold text-[var(--ink)]">
                      {hasPresetChapters ? '章节划分' : '切分章节的单词个数'}
                    </div>
                    <div className="mb-3 text-xs text-[var(--muted)]">
                      {hasPresetChapters
                        ? `当前词典使用原生章节划分，共 ${currentDictionary.chapterCount} 章。`
                        : hasDefaultChapterLength
                          ? `当前词典按原生章节划分，每章 ${activeChapterLength} 词。`
                          : `设置每个章节包含的单词数量（默认为 ${CHAPTER_LENGTH} 个），支持选择预设或自定义数量。`}
                    </div>

                    {!hasPresetChapters && (
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                        <RadioGroup.Root
                          className="grid flex-1 grid-cols-4 gap-2"
                          value={activeChapterLength.toString()}
                          disabled={hasDefaultChapterLength}
                          onValueChange={(val) => {
                            const parsed = Number.parseInt(val, 10)
                            if (!Number.isNaN(parsed) && parsed > 0) {
                              setChapterLengthConfig({ length: parsed })
                              setCurrentChapter(0)
                            }
                          }}
                          aria-label="切分章节的单词个数"
                        >
                          {[20, 50, 100, 200].map((value) => (
                            <RadioGroup.Item
                              className="flex min-h-10 items-center justify-center whitespace-nowrap rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--body)] transition-colors outline-none hover:bg-[var(--surface-soft)] data-[state=checked]:border-[var(--primary)] data-[state=checked]:bg-[var(--primary-soft)] data-[state=checked]:text-[var(--primary)]"
                              value={value.toString()}
                              key={value}
                            >
                              {value} 词
                            </RadioGroup.Item>
                          ))}
                        </RadioGroup.Root>

                        <div className="relative flex h-10 w-full items-center sm:w-32">
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={customChapterLength}
                            disabled={hasDefaultChapterLength}
                            onChange={(e) => setCustomChapterLength(e.target.value)}
                            onBlur={handleCustomChapterLengthSubmit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCustomChapterLengthSubmit()
                                e.currentTarget.blur()
                              }
                            }}
                            placeholder="自定义"
                            aria-label="自定义章节单词个数"
                            className="h-full w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 pr-7 text-sm font-medium text-[var(--ink)] transition-colors outline-none focus:border-[var(--primary)] focus:bg-[var(--surface-raised)]"
                          />
                          <span className="pointer-events-none absolute right-2.5 text-xs font-semibold text-[var(--muted)]">词</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SectionContainer>

              {/* 2. 输入与提示 */}
              <SectionContainer id="sec-input" title="输入与提示" description="调整拼写判断和默写提示。">
                <div className={styles.settingList}>
                  <ToggleSetting checked={ignoreCase} onChange={setIgnoreCase} label="忽略大小写" description="输入时不区分字母大小写。" />
                  <ToggleSetting
                    checked={showDictationHint}
                    onChange={setShowDictationHint}
                    label="默写答案提示"
                    description="鼠标移入隐藏的单词时显示答案。"
                  />
                  <ToggleSetting
                    checked={restartAfterError}
                    onChange={setRestartAfterError}
                    label="错误后重新输入"
                    description="拼写错误后清空当前输入并从头开始。"
                  />
                </div>
              </SectionContainer>

              <SectionContainer id="sec-hotkeys" title="快捷键" description="为练习中的常用操作设置键位。">
                <HotkeySettings />
              </SectionContainer>

              {/* 3. 重复规则 */}
              <SectionContainer id="sec-repeat" title="重复规则" description="设置每个单词连续练习的次数。">
                <RadioGroup.Root
                  className="grid w-full grid-cols-3 gap-2 sm:grid-cols-5"
                  value={loopWordConfig.times.toString()}
                  onValueChange={setLoopCount}
                  aria-label="单词循环次数"
                >
                  {[1, 3, 5, 8, Number.MAX_SAFE_INTEGER].map((value) => (
                    <RadioGroup.Item
                      className="min-h-10 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--body)] transition-colors outline-none hover:bg-[var(--surface-soft)] data-[state=checked]:border-[var(--primary)] data-[state=checked]:bg-[var(--primary-soft)] data-[state=checked]:text-[var(--primary)]"
                      value={value.toString()}
                      key={value}
                    >
                      {value === Number.MAX_SAFE_INTEGER ? '无限' : `${value} 次`}
                    </RadioGroup.Item>
                  ))}
                </RadioGroup.Root>
              </SectionContainer>

              {/* 4. 发音与朗读 */}
              <SectionContainer id="sec-pronunciation" title="发音与朗读" description="配置单词发音音量、语速及口音类型。">
                <div className={styles.settingList}>
                  <SoundSlider
                    label="发音音量"
                    value={pronunciation.volume * 100}
                    valueLabel={`${Math.floor(pronunciation.volume * 100)}%`}
                    max={100}
                    step={10}
                    onChange={setWordVolume}
                  />
                  <SoundSlider
                    label="语速"
                    value={pronunciation.rate}
                    valueLabel={`${toFixedNumber(pronunciation.rate, 2)}x`}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    onChange={setPronunciationRate}
                  />

                  <div className={styles.sliderRow}>
                    <div className={styles.sliderHeader}>
                      <span className={styles.blockLabel}>口音类型</span>
                    </div>
                    <Listbox value={pronunciation.type} onChange={setPronunciationType}>
                      <div className="relative">
                        <Listbox.Button className="listbox-button w-full text-sm sm:w-60" aria-label="口音类型">
                          <span>{selectedAccentLabel}</span>
                          <span>
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition duration-100 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="listbox-options text-sm sm:w-60">
                            {pronunciationOptions.map((option) => (
                              <Listbox.Option key={option.pron} value={option.pron}>
                                {({ selected }) => (
                                  <>
                                    <span>{option.name}</span>
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
                </div>
              </SectionContainer>

              {/* 5. 按键音效 */}
              <SectionContainer id="sec-key-sound" title="按键音效" description="配置键盘敲击时的按键反馈声音与音量。">
                <div className={styles.settingList}>
                  <ToggleControl
                    checked={keySounds.isOpen}
                    onChange={setKeySoundsEnabled}
                    label="按键音"
                    description="输入时播放所选键盘声音。"
                  />
                  <SoundSlider
                    label="按键音量"
                    value={keySounds.volume * 100}
                    valueLabel={`${Math.floor(keySounds.volume * 100)}%`}
                    min={1}
                    max={100}
                    step={10}
                    onChange={setKeySoundVolume}
                    disabled={!keySounds.isOpen}
                  />

                  <div className={styles.sliderRow}>
                    <div className={styles.sliderHeader}>
                      <span className={styles.blockLabel}>键盘声音</span>
                    </div>
                    <Listbox value={keySounds.resource.key} onChange={setKeySoundResource} disabled={!keySounds.isOpen}>
                      <div className="relative">
                        <Listbox.Button className="listbox-button w-full text-sm sm:w-60" aria-label="键盘声音">
                          <span>{keySounds.resource.name}</span>
                          <span>
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition duration-100 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="listbox-options text-sm sm:w-72">
                            {keySoundResources.map((resource) => (
                              <Listbox.Option key={resource.key} value={resource.key}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="truncate">{resource.name}</span>
                                  <button
                                    type="button"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      previewKeySound(resource)
                                    }}
                                    aria-label={`试听 ${resource.name}`}
                                  >
                                    <Ear className="h-4 w-4" />
                                  </button>
                                  {keySounds.resource.key === resource.key && (
                                    <span className="listbox-options-icon">
                                      <Check className="h-4 w-4" />
                                    </span>
                                  )}
                                </div>
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>
                </div>
              </SectionContainer>

              {/* 6. 反馈音效 */}
              <SectionContainer id="sec-feedback-sound" title="反馈音效" description="拼写正确或错误时的提示声音与音量。">
                <div className={styles.settingList}>
                  <ToggleControl
                    checked={feedbackSounds.isOpen}
                    onChange={setFeedbackSoundsEnabled}
                    label="结果提示音"
                    description="拼写正确或错误时播放反馈声音。"
                  />
                  <SoundSlider
                    label="提示音量"
                    value={feedbackSounds.volume * 100}
                    valueLabel={`${Math.floor(feedbackSounds.volume * 100)}%`}
                    min={1}
                    max={100}
                    step={10}
                    onChange={setFeedbackSoundVolume}
                    disabled={!feedbackSounds.isOpen}
                  />
                </div>
              </SectionContainer>

              {/* 7. 重置进度 */}
              <SectionContainer id="sec-reset" title="重置进度" description="将当前词典的练习位置归零，历史学习数据保持不变。">
                <div className="flex w-full flex-col divide-y divide-[var(--line)]">
                  <DataAction
                    title="学习进度"
                    description="从第 1 章第 1 词重新开始，保留学习次数与单词熟练度。"
                    action={
                      <button className="secondary-button whitespace-nowrap" type="button" onClick={resetLearnProgress}>
                        <RotateCcw className="h-4 w-4" />
                        {learnResetComplete ? '已重置' : '重置学习'}
                      </button>
                    }
                  >
                    <span className="text-xs text-[var(--muted)]">仅影响当前选择的词典</span>
                  </DataAction>
                  <DataAction
                    title="默写进度"
                    description="从第 1 章第 1 词重新默写，保留默写次数与单词熟练度。"
                    action={
                      <button className="secondary-button whitespace-nowrap" type="button" onClick={resetDictationProgress}>
                        <RotateCcw className="h-4 w-4" />
                        {dictationResetComplete ? '已重置' : '重置默写'}
                      </button>
                    }
                  >
                    <span className="text-xs text-[var(--muted)]">不会删除其他词典的数据</span>
                  </DataAction>
                </div>
              </SectionContainer>

              {/* 8. 备份与恢复 */}
              <SectionContainer id="sec-backup" title="备份与恢复" description="迁移练习记录、熟练度、章节进度与个性化设置。">
                <div className="flex w-full flex-col divide-y divide-[var(--line)]">
                  <DataAction
                    title="导出备份"
                    description="将当前设备上的完整数据保存为备份文件。"
                    action={
                      <button className="primary-button whitespace-nowrap" type="button" onClick={exportData} disabled={isExporting}>
                        <Download className="h-4 w-4" />
                        {isExporting ? '正在导出' : '导出数据'}
                      </button>
                    }
                  >
                    <ProgressLine label="导出进度" value={exportProgress} />
                  </DataAction>

                  <DataAction
                    title="导入备份"
                    description="从备份文件恢复练习记录与全部设置。"
                    action={
                      <button className="secondary-button whitespace-nowrap" type="button" onClick={importData} disabled={isImporting}>
                        <Upload className="h-4 w-4" />
                        {isImporting ? '正在导入' : '选择备份'}
                      </button>
                    }
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-xs leading-5 text-[var(--danger)]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>导入会覆盖当前练习记录与设置，并在完成后刷新页面。</span>
                      </div>
                      <ProgressLine label="导入进度" value={importProgress} />
                    </div>
                  </DataAction>
                </div>
              </SectionContainer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
