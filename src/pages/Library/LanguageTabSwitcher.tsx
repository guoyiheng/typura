import { LibraryContext } from '.'
import codeFlag from '@/assets/flags/code.png'
import deFlag from '@/assets/flags/de.png'
import enFlag from '@/assets/flags/en.png'
import idFlag from '@/assets/flags/id.png'
import jpFlag from '@/assets/flags/ja.png'
import kkFlag from '@/assets/flags/kk.png'
import type { LanguageCategoryType } from '@/typings'
import { RadioGroup } from '@headlessui/react'
import { useContext } from 'react'

const languageOptions: Array<{ id: LanguageCategoryType; name: string; flag: string }> = [
  { id: 'en', name: '英语', flag: enFlag },
  { id: 'ja', name: '日语', flag: jpFlag },
  { id: 'de', name: '德语', flag: deFlag },
  { id: 'kk', name: '哈萨克语', flag: kkFlag },
  { id: 'id', name: '印尼语', flag: idFlag },
  { id: 'code', name: '编程', flag: codeFlag },
]

export function LanguageTabSwitcher() {
  const libraryContext = useContext(LibraryContext)
  if (!libraryContext) return null

  const { filters, updateFilters } = libraryContext

  const selectLanguage = (language: LanguageCategoryType) => {
    updateFilters((draft) => {
      draft.language = language
      draft.category = 'ALL'
      draft.tag = 'ALL'
    })
  }

  return (
    <RadioGroup value={filters.language} onChange={selectLanguage} aria-label="词典语言">
      <div className="flex max-w-full items-center gap-1 overflow-x-auto border-b border-[var(--line)]">
        {languageOptions.map((option) => (
          <RadioGroup.Option key={option.id} value={option.id} className="focus:outline-none">
            {({ checked }) => (
              <div
                className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  checked ? 'border-[var(--primary)] text-[var(--ink)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <img src={option.flag} className="h-4 w-4 rounded-sm object-cover" alt="" />
                <span className="whitespace-nowrap">{option.name}</span>
              </div>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )
}
