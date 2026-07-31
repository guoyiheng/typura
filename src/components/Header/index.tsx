import type { PropsWithChildren } from 'react'
import type React from 'react'
import { NavLink } from 'react-router-dom'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <header className="top-nav z-20 w-full">
      <div className="top-nav__inner mx-auto flex max-w-[1480px] flex-col items-stretch gap-3 px-4 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <NavLink className="group flex min-w-0 items-center gap-3 text-[var(--ink)] no-underline" to="/" aria-label="Typura 纯键 练习首页">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-raised)] shadow-sm transition-transform group-hover:-translate-y-0.5">
            <img className="h-8 w-8" src="/typura-mark.svg" alt="" aria-hidden="true" />
          </span>
          <span className="font-display min-w-0 truncate text-[22px] font-semibold">Typura 纯键</span>
        </NavLink>

        <nav className="top-nav__tools flex w-full min-w-0 flex-wrap items-center gap-1 lg:w-auto lg:flex-nowrap" aria-label="练习工具栏">
          {children}
        </nav>
      </div>
    </header>
  )
}

export default Header
