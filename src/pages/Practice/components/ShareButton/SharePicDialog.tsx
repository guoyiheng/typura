import { PracticeContext } from '../../store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { currentChapterAtom, currentChapterInfoAtom, currentDictInfoAtom } from '@/store'
import { hasDictionaryPresetChapters } from '@/utils'
import { useAtomValue } from 'jotai'
import { Download, LoaderCircle } from 'lucide-react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

const IMAGE_SCALE = 3
const PRACTICE_CAPTIONS = [
  ['节奏正好', '每一次输入都更接近熟练'],
  ['稳步向前', '准确与速度正在同步积累'],
  ['保持专注', '今天的练习已经留下轨迹'],
  ['手感在线', '清晰的节奏来自持续练习'],
]

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export default function SharePicDialog({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void }) {
  const practiceContext = useContext(PracticeContext)
  const captureRef = useRef<HTMLDivElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [caption] = useState(() => PRACTICE_CAPTIONS[Math.floor(Math.random() * PRACTICE_CAPTIONS.length)])
  const activeDictionary = useAtomValue(currentDictInfoAtom)
  const activeChapter = useAtomValue(currentChapterAtom)
  const activeChapterInfo = useAtomValue(currentChapterInfoAtom)
  const hasPresetChapters = hasDictionaryPresetChapters(activeDictionary)

  useEffect(() => {
    const renderImage = async () => {
      const { toPng } = await import('html-to-image')
      if (!captureRef.current) return

      const { offsetWidth, offsetHeight } = captureRef.current
      const url = await toPng(captureRef.current, {
        canvasWidth: offsetWidth * IMAGE_SCALE,
        canvasHeight: offsetHeight * IMAGE_SCALE,
      })
      setImageUrl(url)
    }

    void renderImage()
  }, [])

  const downloadImage = useCallback(async () => {
    if (!imageUrl) return
    const { saveAs } = await import('file-saver')
    saveAs(imageUrl, 'typura-practice.png')
  }, [imageUrl])

  if (!practiceContext) return null
  const { state } = practiceContext

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] gap-0 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">练习成绩图</DialogTitle>
          </DialogHeader>
          <div className="mt-5 aspect-[17/22] overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-soft)]">
            {imageUrl ? (
              <img src={imageUrl} className="h-full w-full object-contain" alt="Typura 练习成绩图预览" />
            ) : (
              <div className="flex h-full items-center justify-center" role="status" aria-label="正在生成成绩图">
                <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" />
              </div>
            )}
          </div>
          <button type="button" className="primary-button mt-5 w-full" onClick={downloadImage} disabled={!imageUrl}>
            <Download className="h-4 w-4" />
            保存图片
          </button>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed top-0 left-[-9999px]">
        <div
          ref={captureRef}
          className="relative flex h-[440px] w-[340px] flex-col overflow-hidden bg-[#faf9f5] px-7 pt-7 pb-6 text-[#171714]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e0d7] bg-[#ffffff]">
                <img className="h-6 w-6" src="/typura-mark.svg" alt="" aria-hidden="true" />
              </span>
              <p className="font-display text-lg leading-none font-semibold">Typura</p>
            </div>
            <span className="text-[10px] font-medium text-[#77736b]">练习记录</span>
          </div>

          <div className="mt-8 border-t border-[#e5e0d7] pt-7">
            <span className="block h-1 w-7 bg-[#397a50]" />
            <p className="font-display mt-4 text-[36px] leading-none font-semibold">{caption[0]}</p>
            <p className="mt-2.5 text-xs leading-relaxed text-[#77736b]">{caption[1]}</p>
          </div>

          <div className="mt-7 grid grid-cols-[1.35fr_1fr_1fr] items-end border-y border-[#e5e0d7] py-4">
            <div>
              <div className="font-display text-[38px] leading-none font-semibold text-[#397a50]">{state.timerData.accuracy}%</div>
              <div className="mt-1.5 text-[9px] font-medium text-[#77736b]">准确率</div>
            </div>
            <ShareMetric value={formatDuration(state.timerData.time)} label="用时" divided />
            <ShareMetric value={String(state.timerData.wpm)} label="WPM" divided />
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-[#77736b]">练习范围</p>
              <p className="mt-1.5 text-sm leading-snug font-semibold break-words">{activeDictionary.name}</p>
            </div>
            <div className="max-w-28 shrink-0 text-right">
              <p className="text-[9px] font-semibold text-[#77736b]">章节</p>
              <p className="font-display mt-1 text-xl leading-tight font-semibold text-[#397a50]">{String(activeChapter + 1).padStart(2, '0')}</p>
              {hasPresetChapters && activeChapterInfo && (
                <p className="mt-1 truncate text-[10px] font-semibold text-[#397a50]">{activeChapterInfo.name}</p>
              )}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-[#e5e0d7] pt-4" aria-hidden="true">
            <span className="h-1.5 w-1.5 bg-[#397a50]" />
            <span className="h-px flex-1 bg-[#e5e0d7]" />
            <span className="h-1.5 w-1.5 border border-[#171714]" />
          </div>
        </div>
      </div>
    </>
  )
}

function ShareMetric({ value, label, divided = false }: { value: string; label: string; divided?: boolean }) {
  return (
    <div className={`pl-3 text-left ${divided ? 'border-l border-[#e5e0d7]' : ''}`}>
      <div className="font-display text-lg leading-none font-semibold">{value}</div>
      <div className="mt-1.5 text-[9px] font-medium text-[#77736b]">{label}</div>
    </div>
  )
}
