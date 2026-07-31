import HandPositionIllustration from '../HandPositionIllustration'
import HotkeyFloatPanel from '../HotkeyFloatPanel'
import Tooltip from '@/components/Tooltip'
import { isOpenDarkModeAtom } from '@/store'
import { useAtom } from 'jotai'
import { Moon, Settings2, Sun } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'

const Setting = lazy(() => import('../Setting'))

export default function SettingsMenu() {
  const [isDarkMode, setIsDarkMode] = useAtom(isOpenDarkModeAtom)
  const [isSettingsMounted, setIsSettingsMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const openSettings = () => {
    setIsSettingsMounted(true)
    setIsSettingsOpen(true)
  }

  return (
    <div className="settings-quick-actions ml-auto flex items-center gap-0.5 border-l border-[var(--line)] pl-1" aria-label="常用设置">
      <Tooltip content={isDarkMode ? '切换浅色主题' : '切换深色主题'} placement="bottom">
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsDarkMode((current) => !current)}
          aria-label={isDarkMode ? '切换浅色主题' : '切换深色主题'}
        >
          {isDarkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </Tooltip>

      <Tooltip content="指法图示" placement="bottom">
        <HandPositionIllustration />
      </Tooltip>

      <HotkeyFloatPanel />

      <Tooltip content="完整设置" placement="bottom">
        <button
          type="button"
          className={`icon-button ${isSettingsOpen ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : ''}`}
          onClick={openSettings}
          aria-label="打开完整设置"
          aria-pressed={isSettingsOpen}
        >
          <Settings2 className="h-[18px] w-[18px]" />
        </button>
      </Tooltip>

      {isSettingsMounted && (
        <Suspense fallback={null}>
          <Setting open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </Suspense>
      )}
    </div>
  )
}
