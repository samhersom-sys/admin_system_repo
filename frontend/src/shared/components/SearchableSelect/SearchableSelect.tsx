import { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

interface SearchableSelectProps {
  id: string
  ariaLabel: string
  placeholder?: string
  value: string
  options: string[]
  disabled?: boolean
  onChange: (nextValue: string) => void
}

/**
 * SearchableSelect
 *
 * Token-based, reusable searchable single-select dropdown.
 * Panel is anchored directly below the field for consistent layout behavior.
 */
export default function SearchableSelect({
  id,
  ariaLabel,
  placeholder = 'Select...',
  value,
  options,
  disabled,
  onChange,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, query])

  const inputCls = 'block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed'

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={id}
          aria-label={ariaLabel}
          type="text"
          value={isOpen ? query : value}
          onFocus={() => {
            setQuery(value)
            setIsOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={inputCls}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-y-0 right-0 px-3 text-gray-500"
          onClick={() => {
            if (disabled) return
            setQuery(value)
            setIsOpen((o) => !o)
          }}
        >
          <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No matching users</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt)
                    setQuery(opt)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value === opt ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'}`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
