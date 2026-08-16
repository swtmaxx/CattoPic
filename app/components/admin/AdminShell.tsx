'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../hooks/useSession'
import { useTheme } from '../../hooks/useTheme'
import { showToast } from '../ToastContainer'
import {
  ImageIcon,
  GearIcon,
  SunIcon,
  MoonIcon,
  PersonIcon,
  LayoutDashboardIcon,
  UploadIcon,
} from '../ui/icons'

const NAV_ITEMS = [
  { href: '/admin', label: '概览', icon: LayoutDashboardIcon },
  { href: '/manage', label: '图片管理', icon: ImageIcon },
  { href: '/admin/settings', label: '系统设置', icon: GearIcon },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { logout } = useSession()
  const { isDarkMode, toggleTheme } = useTheme()

  // 登录/初始化页面独立居中展示，不套后台框架
  const isStandalone = pathname?.startsWith('/admin/login') || pathname?.startsWith('/admin/setup')
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/') || pathname === '/manage' || pathname?.startsWith('/manage/')
  if (isStandalone || !isAdminRoute) return <>{children}</>

  const handleLogout = async () => {
    await logout()
    queryClient.clear()
    showToast('已退出登录', 'success')
    router.replace('/admin/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href)
  }

  const navLinkClass = (href: string) =>
    `admin-nav-link ${isActive(href) ? 'is-active' : ''}`

  return (
    <div className="admin-shell min-h-screen">
      <header className="admin-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="brand-mark shrink-0" aria-label="返回 CattoPic 上传页">
              <ImageIcon className="h-4 w-4 text-white" />
            </Link>
            <div className="min-w-0">
              <div className="brand-name">CattoPic</div>
              <div className="brand-context truncate">控制台</div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="后台导航">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link href="/" className={navLinkClass('/')}>
              <UploadIcon className="h-4 w-4" />
              上传页
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/" className="btn-icon md:hidden" title="上传页" aria-label="打开上传页">
              <UploadIcon className="h-5 w-5" />
            </Link>
            <button onClick={toggleTheme} className="btn-icon" title={isDarkMode ? "切换到浅色" : "切换到深色"} aria-label={isDarkMode ? "切换到浅色" : "切换到深色"}>
              {isDarkMode ? <SunIcon className="h-5 w-5 text-amber-500" /> : <MoonIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
            </button>
            <button onClick={() => void handleLogout()} className="btn-icon" title="退出登录" aria-label="退出登录">
              <PersonIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="mobile-nav-scroll flex gap-1 overflow-x-auto border-t border-[var(--app-border)] px-4 py-2 md:hidden" aria-label="后台导航">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <Link href="/" className={navLinkClass('/')}>
            <UploadIcon className="h-4 w-4" />
            上传页
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
