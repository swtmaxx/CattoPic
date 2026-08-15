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

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href))

  const navLinkClass = (href: string) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
      isActive(href)
        ? 'bg-indigo-500 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
    }`

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* 顶栏：页面切换 + 操作 */}
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="bg-indigo-500 w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-white" />
            </Link>
            <span className="font-bold text-gray-900 dark:text-white hidden sm:block">CattoPic</span>
          </div>

          {/* 页面切换（桌面） */}
          <nav className="hidden md:flex items-center gap-1">
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

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="btn-icon md:hidden" title="上传页">
              <UploadIcon className="h-5 w-5" />
            </Link>
            <button onClick={toggleTheme} className="btn-icon" title={isDarkMode ? "切换到浅色" : "切换到深色"}>
              {isDarkMode ? <SunIcon className="h-5 w-5 text-amber-500" /> : <MoonIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
            </button>
            <button onClick={() => void handleLogout()} className="btn-icon" title="退出登录">
              <PersonIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 页面切换（移动端） */}
        <nav className="md:hidden flex gap-1 px-3 pb-3 overflow-x-auto">
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

      <main className="px-4 sm:px-6 py-6">{children}</main>
    </div>
  )
}
