import standTypingHandPositionDark from '@/assets/standard_typing_hand_position_dark.svg'
import standTypingHandPositionLight from '@/assets/standard_typing_hand_position_light.svg'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { isOpenDarkModeAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { Keyboard } from 'lucide-react'

export default function HandPositionIllustration() {
  const isDarkMode = useAtomValue(isOpenDarkModeAtom)
  const standTypingHandPosition = isDarkMode ? standTypingHandPositionDark : standTypingHandPositionLight

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="icon-button" aria-label="打开指法图示">
          <Keyboard className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-[860px] gap-0 overflow-hidden border-[var(--line)] bg-[var(--surface)] p-0 shadow-2xl">
        <DialogHeader className="border-b border-[var(--line)] px-5 py-4 pr-14 text-left sm:px-6">
          <p className="mb-0.5 text-xs font-semibold text-[var(--primary)]">参考图示</p>
          <DialogTitle className="text-xl font-bold sm:text-2xl">标准键盘指法分布</DialogTitle>
        </DialogHeader>
        <div className="p-3 sm:p-5">
          <img
            className="block h-auto w-full transition-opacity duration-300"
            src={standTypingHandPosition}
            alt="标准键盘指法位置图"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

