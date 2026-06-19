import { useState, useCallback } from 'react'

const STORAGE_KEY = 'dental-package-configurator-data'

export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed[key] !== undefined) {
          return parsed[key]
        }
      }
    } catch {
      // ignore
    }
    return defaultValue
  })

  const updateState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = value instanceof Function ? value(prev) : value
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const parsed = stored ? JSON.parse(stored) : {}
        parsed[key] = next
        parsed.lastSavedAt = new Date().toISOString()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      } catch {
        // ignore
      }
      return next
    })
  }, [key])

  return [state, updateState]
}

export function getLastSavedTime(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.lastSavedAt || null
    }
  } catch {
    // ignore
  }
  return null
}

export function formatSavedTime(isoString: string | null): string {
  if (!isoString) return '尚未保存'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return '刚刚保存'
  if (diffMin < 60) return `${diffMin}分钟前保存`

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 保存`
  }

  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 保存`
}
