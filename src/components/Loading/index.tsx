import React from 'react'

export const LoadingUI: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-[var(--primary)] border-r-transparent align-[-0.125em] motion-reduce:animate-none ${
        className ?? ''
      }`}
      role="status"
    >
      <span className="sr-only">正在加载</span>
    </div>
  )
}

const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--canvas)]">
      <LoadingUI />
    </div>
  )
}

export default React.memo(Loading)
