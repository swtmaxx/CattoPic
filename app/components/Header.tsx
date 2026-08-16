'use client'

import Link from 'next/link'
import { useTheme } from '../hooks/useTheme'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { ImageIcon, HamburgerMenuIcon, SunIcon, MoonIcon, TagIcon, Link2Icon, PersonIcon } from './ui/icons'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import type { ImageListResponse } from '../types'
import { api } from '../utils/request'

interface HeaderProps {
  onTagManageClick?: () => void
  onRandomApiClick?: () => void
  onLogoutClick?: () => void
  title?: string
  authenticated?: boolean
  /** 是否显示主题切换按钮（后台框架模式下由外壳提供） */
  showThemeToggle?: boolean
}

export default function Header({ onTagManageClick, onRandomApiClick, onLogoutClick, title, authenticated = false, showThemeToggle = true }: HeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const getTitle = () => {
    if (title) return title
    if (pathname === '/manage') return '图片管理'
    return '图片上传'
  }

  return (
    <header className="app-header relative z-40 mb-6 flex items-center justify-between gap-4 sm:mb-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="brand-mark shrink-0" aria-label="返回 CattoPic 上传页">
          <ImageIcon className="h-5 w-5 text-white" />
        </Link>
        <div className="min-w-0">
          <div className="brand-name">CattoPic</div>
          <h1 className="header-title truncate">{getTitle()}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {!pathname?.startsWith('/manage') && (
          <Link
            href="/manage"
            className="btn-icon"
            title="图片管理"
            aria-label="打开图片管理"
            onClick={() => {
              // Warm up Manage page list without clearing existing cache (avoid loading spinner).
              void queryClient.prefetchInfiniteQuery({
                queryKey: queryKeys.images.list({ tag: '', orientation: '', format: 'all', limit: 60 }),
                initialPageParam: 1,
                queryFn: async ({ pageParam = 1 }) => {
                  const params: Record<string, string> = {
                    page: String(pageParam),
                    limit: '60',
                  }
                  const response = await api.get<ImageListResponse>('/api/images', params)
                  return response
                },
                getNextPageParam: (lastPage: ImageListResponse) => {
                  if (lastPage.page < lastPage.totalPages) return lastPage.page + 1
                  return undefined
                },
              })
            }}
          >
            <HamburgerMenuIcon className="h-6 w-6" />
          </Link>
        )}

        {pathname?.startsWith('/manage') && onTagManageClick && (
          <button onClick={onTagManageClick} className="btn-icon" title="标签管理">
            <TagIcon className="h-6 w-6" />
          </button>
        )}

        {pathname?.startsWith('/manage') && onRandomApiClick && (
          <button onClick={onRandomApiClick} className="btn-icon" title="随机图API生成器">
            <Link2Icon className="h-6 w-6" />
          </button>
        )}

        {pathname?.startsWith('/admin') && (
          <Link href="/admin" className="btn-icon" title="后台管理" aria-label="打开后台管理">
            <PersonIcon className="h-6 w-6" />
          </Link>
        )}

        {onLogoutClick && (
          <button onClick={onLogoutClick} className="btn-icon relative" title="退出登录" aria-label="退出登录">
            <PersonIcon className="h-6 w-6" />
            {authenticated && (
              <motion.div
                className="absolute right-0.5 top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--accent-500)] ring-2 ring-[var(--app-canvas)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <motion.div className="h-1 w-1 rounded-full bg-white" />
              </motion.div>
            )}
          </button>
        )}

        {showThemeToggle && (
          <button onClick={toggleTheme} className="btn-icon" title={isDarkMode ? '切换到浅色' : '切换到深色'} aria-label={isDarkMode ? '切换到浅色' : '切换到深色'}>
            {isDarkMode ? (
              <SunIcon className="h-6 w-6 text-amber-500" />
            ) : (
              <MoonIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            )}
          </button>
        )}
      </div>
    </header>
  )
}
