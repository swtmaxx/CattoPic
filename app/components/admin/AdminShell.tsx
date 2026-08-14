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
  if (isStandalone) return <>{children}</>

  const handleLogout = async () => {
    await logout()
    queryClient.clear()
    showToast('已退出登录', 'success')
    router.replace('/admin/login')
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* 侧边栏（桌面） */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 z-30">
        <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="bg-indigo-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white leading-tight">CattoPic</div>
            <div className="text-xs text-gray-400">后台管理</div>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <UploadIcon className="h-5 w-5" />
            上传页
          </Link>
        </div>
      </aside>

      <div className="md:pl-56">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 md:hidden">
              <Link href="/" className="bg-indigo-500 w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <ImageIcon className="h-4 w-4 text-white" />
              </Link>
              <span className="font-bold text-gray-900 dark:text-white">CattoPic</span>
            </div>
            <div className="hidden md:block">
              <span className="text-sm text-gray-400">管理后台</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/" className="btn-icon" title="上传页">
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
          {/* 移动端导航 */}
          <nav className="md:hidden flex gap-1 px-3 pb-3 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                  isActive(item.href) ? 'bg-indigo-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <UploadIcon className="h-4 w-4" />
              上传页
            </Link>
          </nav>
        </header>

        <main className="px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  )
}