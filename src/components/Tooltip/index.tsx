import { classNames } from '@/utils'
import type { FocusEvent, ReactNode } from 'react'
import { useState } from 'react'

const Tooltip = ({ children, content, className, placement = 'top', disabled = false }: TooltipProps) => {
  const [visible, setVisible] = useState(false)

  // 鼠标点击会把按钮聚焦，但不应该因此留下提示浮层。
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof HTMLElement && target.matches(':focus-visible')) {
      setVisible(true)
    }
  }

  const placementClasses = {
    top: 'bottom-full pb-2',
    bottom: 'top-full pt-2',
  }[placement]

  return (
    <div className={classNames('relative', className)}>
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={handleFocus}
        onBlur={() => setVisible(false)}
      >
        {children}
      </div>
      {visible && !disabled && (
        <div
          className={`${placementClasses} pointer-events-none absolute left-1/2 z-[200] flex -translate-x-1/2 transform items-center justify-center`}
        >
          <span className="tooltip">{content}</span>
        </div>
      )}
    </div>
  )
}

type TooltipProps = {
  children: ReactNode
  /** 显示文本 */
  content: string
  /** 位置 */
  placement?: 'top' | 'bottom'
  className?: string
  /** 禁用提示显示，适用于关联浮层已展开的状态。 */
  disabled?: boolean
}

export default Tooltip
