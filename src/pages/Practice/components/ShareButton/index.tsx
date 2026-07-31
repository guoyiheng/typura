import SharePicDialog from './SharePicDialog'
import { Share2 } from 'lucide-react'
import { useState } from 'react'

export default function ShareButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {isOpen && <SharePicDialog isOpen={isOpen} setIsOpen={setIsOpen} />}
      <button type="button" className="icon-button" onClick={() => setIsOpen(true)} aria-label="生成练习成绩图">
        <Share2 className="h-4 w-4" />
      </button>
    </>
  )
}
