import { classNames } from '@/utils'
import type { ReactNode } from 'react'
import { useState } from 'react'

const Tooltip = ({ children, content, className, placement = 'top', disabled = false }: TooltipProps) => {
  const [visible, setVisible] = useState(false)

  const placementClasses = {
    top: 'bottom-full pb-2',
    bottom: 'top-full pt-2',
  }[placement]

  return (
    <div className={classNames('relative', className)}>
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
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
