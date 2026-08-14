'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ThemeAccent, ThemeMode } from '../types'

const OVERRIDE_KEY = 'theme'
const OVERRIDE_FLAG_KEY = 'theme-override'

interface SiteTheme {
  accent: ThemeAccent
  mode: ThemeMode
}

const DEFAULT_THEME: SiteTheme = { accent: 'green', mode: 'system' }
const ACCENTS: ThemeAccent[] = ['green', 'blue', 'violet', 'red', 'orange']
const MODES: ThemeMode[] = ['system', 'light', 'dark']

let configPromise: Promise<SiteTheme> | null = null

function fetchThemeConfig(): Promise<SiteTheme> {
  if (!configPromise) {
    configPromise = fetch('/api/config', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('config fetch failed'))))
      .then((data) => {
        const t = data?.config?.theme
        return {
          accent: ACCENTS.includes(t?.accent) ? t.accent : DEFAULT_THEME.accent,
          mode: MODES.includes(t?.mode) ? t.mode : DEFAULT_THEME.mode,
        }
      })
      .catch(() => DEFAULT_THEME)
  }
  return configPromise
}

function getOverride(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null
  try {
    if (localStorage.getItem(OVERRIDE_FLAG_KEY) === '1') {
      const value = localStorage.getItem(OVERRIDE_KEY)
      return value === 'dark' || value === 'light' ? value : null
    }
  } catch {
    // ignore storage errors
  }
  return null
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(mode: ThemeMode, override: 'light' | 'dark' | null): boolean {
  if (override) return override === 'dark'
  if (mode === 'light') return false
  if (mode === 'dark') return true
  return systemDark()
}

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => resolveDark(DEFAULT_THEME.mode, getOverride()))
  const [accent, setAccent] = useState<ThemeAccent>(DEFAULT_THEME.accent)

  useEffect(() => {
    let cancelled = false

    const apply = (dark: boolean, value: ThemeAccent) => {
      if (cancelled) return
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.accent = value
      setIsDarkMode(dark)
      setAccent(value)
    }

    const override = getOverride()
    void fetchThemeConfig().then((theme) => {
      apply(resolveDark(theme.mode, override), theme.accent)
    })

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (getOverride()) return
      void fetchThemeConfig().then((theme) => {
        apply(resolveDark(theme.mode, null), theme.accent)
      })
    }
    media.addEventListener('change', handleSystemChange)

    return () => {
      cancelled = true
      media.removeEventListener('change', handleSystemChange)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem(OVERRIDE_KEY, next ? 'dark' : 'light')
        localStorage.setItem(OVERRIDE_FLAG_KEY, '1')
      } catch {
        // ignore storage errors
      }
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }, [])

  return { isDarkMode, toggleTheme, accent }
}