import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastProvider } from "@/components/ui/Toast"
import { NotificationBell } from "@/components/shared/NotificationBell"
import { PauseBanner } from "@/components/shared/PauseBanner"
import { ScrollToTop } from "@/components/layout/ScrollToTop"
import { SettingsModal } from "@/components/settings"
import { useShop } from "@/hooks/useShop"
import { useShopStore } from "@/store/shopStore"
import { useUIStore } from "@/store/uiStore"
import { shopService } from "@/services/shopService"
import api from '@/services/api'
import type { Post } from '@/types/post.types'
import { cn } from '@utils/cn'
import {
  LayoutDashboard, CheckSquare, CalendarDays, BarChart2,
  Package, Settings, Send,
  X, Menu, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',        path: '/',          badge: false, modal: false, settings: false },
  { icon: CheckSquare,     label: 'Approval Queue',   path: '/approval',  badge: true,  modal: false, settings: false },
  { icon: CalendarDays,    label: 'Content Calendar', path: '/calendar',  badge: false, modal: false, settings: false },
  { icon: BarChart2,       label: 'Analytics',        path: '/analytics', badge: false, modal: false, settings: false },
  { icon: Send,            label: 'Published Posts',  path: '/published', badge: false, modal: false, settings: false },
  { icon: Package,         label: 'Products',         path: '/products',  badge: false, modal: false, settings: false },
  { icon: Settings,        label: 'Settings',         path: '',           badge: false, modal: false, settings: true  },
  { icon: WhatsAppIcon,    label: 'WhatsApp Export',  path: '/whatsapp',  badge: false, modal: false, settings: false },
]

interface SidebarProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const shop = useShopStore(s => s.shop)
  const openSettings = useUIStore(s => s.openSettings)

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-data'],
    queryFn: shopService.getOnboardingData,
    staleTime: 5 * 60 * 1000,
  })

  const { data: postsData } = useQuery({
    queryKey: ['posts', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<Post[]>('/posts/dashboard')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
  })

  const pendingCount = postsData?.filter(p => p.status === 'pending_approval').length ?? 0
  const autoApprove = onboardingData?.preferences?.autoApprove ?? false
  const shopDomain = shop?.shopDomain ?? ''
  const displayBrandName = onboardingData?.brand?.brandName?.trim() || shop?.shopName?.trim() || null
  const displayWebsite = (() => {
    const url = onboardingData?.brand?.websiteUrl
    if (!url) return null
    return url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '') || null
  })()

  const handleNav = (item: typeof NAV_ITEMS[number]) => {
    if (item.settings) {
      openSettings()
      onClose?.()
      return
    }
    navigate(item.path)
    onClose?.()
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-zinc-950 text-white overflow-y-auto overflow-x-hidden transition-all duration-200',
      collapsed ? 'w-14' : 'w-70',
    )}>
      {/* App identity */}
      <div className={cn(
        'border-b border-zinc-800 flex items-center gap-3 shrink-0',
        collapsed ? 'p-3 justify-center' : 'p-6',
      )}>
        <img
          src="/logo.jpg"
          alt="VisualFlow AI"
          className="w-8 h-8 rounded-lg object-cover shrink-0"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-white text-sm leading-tight">VisualFlow AI</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {displayBrandName ?? shopDomain}
            </p>
            {displayBrandName && displayWebsite && (
              <p className="text-[10px] text-zinc-600 truncate leading-tight">{displayWebsite}</p>
            )}
          </div>
        )}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className={cn('p-2 space-y-0.5 flex-1', !collapsed && 'p-4 space-y-1')}>
        {NAV_ITEMS.map(item => {
          const isActive = !item.modal && !item.settings && location.pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => handleNav(item)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center rounded-xl transition-all duration-150 text-left cursor-pointer relative',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4.5 text-center leading-none">
                  {pendingCount}
                </span>
              )}
              {collapsed && item.badge && pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Auto-approve status — hidden when collapsed */}
      {!collapsed && (
        <div className="mx-4 mb-2 shrink-0">
          <div className="bg-zinc-900 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-zinc-300">Auto-Approve</p>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                autoApprove ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
              )}>
                {autoApprove ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">
              {autoApprove ? 'Posts publish automatically' : 'Manual review required'}
            </p>
            <button
              onClick={() => { openSettings(); onClose?.() }}
              className="text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
            >
              Manage →
            </button>
          </div>
        </div>
      )}

      {/* Collapse / expand toggle — desktop only */}
      {onToggleCollapse && (
        <div className={cn('border-t border-zinc-800 shrink-0', collapsed ? 'p-2' : 'p-4')}>
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-zinc-800 w-full',
              collapsed ? 'justify-center p-2' : 'px-3 py-2',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <>
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">Collapse</span>
                </>
            }
          </button>
        </div>
      )}
    </div>
  )
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  useShop()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isOnboarded = useShopStore(s => s.isShopOnboarded)
  const setShop = useShopStore(s => s.setShop)
  const shop = useShopStore(s => s.shop)
  const queryClient = useQueryClient()

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-data'],
    queryFn: shopService.getOnboardingData,
    staleTime: 5 * 60 * 1000,
    enabled: isOnboarded,
  })
  const displayBrandName = onboardingData?.brand?.brandName?.trim() || shop?.shopName?.trim() || null

  const { mutate: resumeFromBanner } = useMutation({
    mutationFn: () => shopService.pauseShop(false),
    onSuccess: () => {
      if (shop) setShop({ ...shop, isGlobalPaused: false })
      void queryClient.invalidateQueries({ queryKey: ['shop', 'status'] })
    },
  })

  return (
    <ToastProvider>
      <ScrollToTop />
      <div className="relative min-h-screen flex bg-surface-50">

        {/* Desktop sidebar */}
        {isOnboarded && (
          <aside className={cn(
            'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-200',
            sidebarCollapsed ? 'w-14' : 'w-70',
          )}>
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            />
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {isOnboarded && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-70 z-50 lg:hidden flex flex-col">
              <Sidebar
                onClose={() => setSidebarOpen(false)}
              />
            </aside>
          </>
        )}

        {/* Main area */}
        <div className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-200',
          isOnboarded && (sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-70'),
        )}>

          {/* Mobile top bar */}
          {isOnboarded && (
            <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white border-b border-surface-100">
              <button
                onClick={() => setSidebarOpen(true)}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors cursor-pointer shrink-0"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-zinc-700" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-zinc-900 text-sm leading-tight">VisualFlow AI</p>
              </div>
              {displayBrandName && (
                <div className="flex items-center gap-1.5 bg-linear-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  <span className="text-xs font-semibold text-violet-700 truncate max-w-28 tracking-wide">{displayBrandName}</span>
                </div>
              )}
              <NotificationBell />
            </div>
          )}

          <PauseBanner onResume={() => resumeFromBanner()} />
          <main className="flex-1 pb-4 safe-bottom">{children}</main>
        </div>
      </div>

      <SettingsModal />
    </ToastProvider>
  )
}
