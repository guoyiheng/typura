import type { WordUpdateAction } from '../InputHandler'
import { PracticeContext } from '@/pages/Practice/store'
import type { FormEvent } from 'react'
import { useCallback, useContext, useEffect, useRef } from 'react'

export default function TextAreaHandler({ updateInput }: { updateInput: (updateObj: WordUpdateAction) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { state } = useContext(PracticeContext)!

  useEffect(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    } else {
      textareaRef.current.blur()
    }
  }, [state.isTyping])

  const onInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent
    if (!nativeEvent.isComposing && nativeEvent.data !== null) {
      updateInput({ type: 'add', value: nativeEvent.data, event: e })

      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
    }
  }

  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    }
  }, [state.isTyping])

  return (
    <textarea
      className="practice-input absolute top-0 left-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 shadow-none outline-none focus:border-0 focus:ring-0 focus:outline-none"
      data-practice-input="true"
      ref={textareaRef}
      autoFocus
      spellCheck="false"
      onInput={onInput}
      onBlur={onBlur}
      onCompositionStart={() => {
        alert('您正在使用输入法，请关闭输入法。')
      }}
    ></textarea>
  )
}
