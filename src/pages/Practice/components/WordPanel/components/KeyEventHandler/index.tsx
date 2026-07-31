import type { WordUpdateAction } from '../InputHandler'
import { PracticeContext } from '@/pages/Practice/store'
import { isChineseSymbol, isLegal } from '@/utils'
import { useCallback, useContext, useEffect } from 'react'

export default function KeyEventHandler({ updateInput }: { updateInput: (updateObj: WordUpdateAction) => void }) {
  const { state } = useContext(PracticeContext)!

  const onKeydown = useCallback(
    (e: KeyboardEvent) => {
      const char = e.key

      if (char === 'Backspace') {
        updateInput({ type: 'delete', length: 1 })
        return
      }

      if (isChineseSymbol(char)) {
        alert('您正在使用输入法，请关闭输入法。')
        return
      }

      if (char === ' ') {
        e.preventDefault()
        updateInput({ type: 'add', value: char, event: e })
        return
      }

      if (isLegal(char) && !e.altKey && !e.ctrlKey && !e.metaKey) {
        updateInput({ type: 'add', value: char, event: e })
      }
    },
    [updateInput],
  )

  useEffect(() => {
    if (!state.isTyping) return

    window.addEventListener('keydown', onKeydown)
    return () => {
      window.removeEventListener('keydown', onKeydown)
    }
  }, [onKeydown, state.isTyping])

  return <></>
}
