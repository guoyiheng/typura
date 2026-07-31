import Footer from './Footer'
import { isZenModeAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const isZenMode = useAtomValue(isZenModeAtom)

  return (
    <main className={`app-shell flex h-screen w-full flex-col items-center overflow-hidden ${isZenMode ? '' : 'pb-2'}`}>
      {children}
      {!isZenMode && <Footer />}
    </main>
  )
}
