'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ThemeAccent, ThemeMode } from '../types'
import { api } from '../utils/request'
import { useSession } from './useSession'

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
    // The configuration endpoint is public so the saved theme also applies on
    // the login and first-time setup pages.
    configPromise = api
      .get<{ success: boolean; config?: { theme?: Partial<SiteTheme> } }>('/api/config')
      .then((data) => {
        const t = data.config?.theme
        return {
          accent: ACCENTS.includes(t?.accent as ThemeAccent)
            ? t?.accent as ThemeAccent
            : DEFAULT_THEME.accent,
          mode: MODES.includes(t?.mode as ThemeMode)
            ? t?.mode as ThemeMode
            : DEFAULT_THEME.mode,
        }
      })
      .catch((error) => {
        // Do not cache an unauthenticated/network failure. The shell remains
        // mounted across login, so a later authenticated render must retry.
        configPromise = null
        throw error
      })
  }
  return configPromise
}

/** Call after updating the server-side theme configuration. */
export function invalidateThemeConfig() {
  configPromise = null
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
  const { status, loading } = useSession()
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => resolveDark(DEFAULT_THEME.mode, getOverride()))
  const [accent, setAccent] = useState<ThemeAccent>(DEFAULT_THEME.accent)

  useEffect(() => {
    if (loading) return
    let cancelled = false

    const apply = (dark: boolean, value: ThemeAccent) => {
      if (cancelled) return
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.accent = value
      setIsDarkMode(dark)
      setAccent(value)
    }

    const applyConfig = () => {
      const override = getOverride()
      void fetchThemeConfig()
        .then((theme) => apply(resolveDark(theme.mode, override), theme.accent))
        .catch(() => {
          if (!cancelled) apply(resolveDark(DEFAULT_THEME.mode, override), DEFAULT_THEME.accent)
        })
    }

    applyConfig()

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (getOverride()) return
      applyConfig()
    }
    media.addEventListener('change', handleSystemChange)

    return () => {
      cancelled = true
      media.removeEventListener('change', handleSystemChange)
    }
  }, [loading, status?.authenticated])

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
