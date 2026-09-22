import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Palette, Sliders, Share2, Calendar, FileText,
  Bell, CreditCard, AlertTriangle, X,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useShopStore } from '@/store/shopStore'
import { shopService } from '@/services/shopService'
import { festivalService } from '@/services/festivalService'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@utils/cn'

import { BrandSettingsTab } from './tabs/BrandSettingsTab'
import { PostingPreferencesTab } from './tabs/PostingPreferencesTab'
import { SocialConnectionsTab } from './tabs/SocialConnectionsTab'
import { FestivalSettingsTab } from './tabs/FestivalSettingsTab'
import { ContentControlsTab } from './tabs/ContentControlsTab'
import { NotificationControlsTab } from './tabs/NotificationControlsTab'
import { BudgetControlsTab } from './tabs/BudgetControlsTab'
import { DangerZoneTab } from './tabs/DangerZoneTab'

import type { BrandState } from './tabs/BrandSettingsTab'
import type { PrefsState } from './tabs/PostingPreferencesTab'
import type { Festival } from '@/types/brand.types'
import { VALID_TIME_SLOTS } from '@/utils/constants'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'brand',         label: 'Brand Settings',      Icon: Palette,       danger: false },
  { id: 'preferences',   label: 'Posting Preferences', Icon: Sliders,       danger: false },
  { id: 'social',        label: 'Social Connections',  Icon: Share2,        danger: false },
  { id: 'festivals',     label: 'Festival Calendar',   Icon: Calendar,      danger: false },
  { id: 'content',       label: 'Content Controls',    Icon: FileText,      danger: false },
  { id: 'notifications', label: 'Notifications',       Icon: Bell,          danger: false },
  { id: 'budget',        label: 'Budget & Billing',    Icon: CreditCard,    danger: false },
  { id: 'danger',        label: 'Danger Zone',         Icon: AlertTriangle, danger: true  },
]

// ─── Default state helpers ────────────────────────────────────────────────────

const defaultBrand = (): BrandState => ({
  logoUrl: undefined,
  primaryColor: '#7c3aed',
  secondaryColor: '#ffffff',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  headingFont: 'Plus Jakarta Sans',
  bodyFont: 'Inter',
  brandPersonality: '',
  photoStyle: '',
  referenceImages: [],
  trustSignals: ['cod', 'free_delivery', 'easy_returns'],
})

const defaultPrefs = (): PrefsState => ({
  postsPerDay: 1,
  postingTimes: [],
  language: 'english',
  budgetMin: 200,
  budgetMax: 500,
  autoApprove: false,
  inventoryThreshold: 5,
  smartTiming: false,
  smartTimingLastCalibrated: null,
  smartTimingPostingTimes: null,
  contentGenerationTime: '02:00',
  notificationTime: '08:00',
  hashtagBlacklist: [],
  bannedWords: [],
  maxEmojiCount: 5,
  requiredDisclaimers: {},
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  monthlyAdBudgetCap: null,
  perProductAdLimit: null,
  notifyOnPublish: true,
  notifyOnHold: true,
  notifyOnAdPause: true,
  notifyOnWeeklyReport: true,
  notifyOnContentGenerated: false,
  emailDigest: false,
})

// ─── SettingsModal ────────────────────────────────────────────────────────────

export function SettingsModal() {
  const isOpen          = useUIStore(s => s.isSettingsOpen)
  const activeTab       = useUIStore(s => s.activeSettingsTab)
  const closeSettings   = useUIStore(s => s.closeSettings)
  const openSettings    = useUIStore(s => s.openSettings)

  const navigate        = useNavigate()
  const queryClient     = useQueryClient()
  const { showToast }   = useToast()
  const shop            = useShopStore(s => s.shop)
  const setPreferredLanguage = useShopStore(s => s.setPreferredLanguage)

  // ── State ──────────────────────────────────────────────────────────────────
  const [brand,         setBrand]         = useState<BrandState>(defaultBrand())
  const [prefs,         setPrefs]         = useState<PrefsState>(defaultPrefs())
  const [originalBrand, setOriginalBrand] = useState<BrandState | null>(null)
  const [originalPrefs, setOriginalPrefs] = useState<PrefsState | null>(null)
  const [selectedFestivalIds,         setSelectedFestivalIds]         = useState<string[]>([])
  const [originalFestivalIds,         setOriginalFestivalIds]         = useState<string[]>([])

  const [pauseConfirmOpen,      setPauseConfirmOpen]      = useState(false)
  const [resetConfirmOpen,      setResetConfirmOpen]      = useState(false)
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false)

  // pending action blocked by unsaved-changes guard
  const [unsavedConfirm, setUnsavedConfirm] = useState<{ open: boolean; onProceed: () => void }>({ open: false, onProceed: () => {} })

  const contentRef    = useRef<HTMLDivElement>(null)
  const isAnyDirtyRef = useRef(false)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: onboardingData } = useQuery({
    queryKey: ['shop', 'onboarding-data'],
    queryFn: shopService.getOnboardingData,
    enabled: isOpen,
  })

  const { data: festivalsPage } = useQuery({
    queryKey: ['festivals'],
    queryFn: async () => { const res = await festivalService.getAll(); return res.data },
    staleTime: 0,
    refetchOnMount: true,
    enabled: isOpen,
  })

  const festivals: Festival[] = festivalsPage ?? []

  // ── Sync server data → local state ────────────────────────────────────────
  useEffect(() => {
    if (onboardingData?.brand) {
      const b = onboardingData.brand
      const loaded: BrandState = {
        logoUrl: b.logoUrl,
        primaryColor: b.primaryColor ?? '#7c3aed',
        secondaryColor: b.secondaryColor ?? '#ffffff',
        accentColor: b.accentColor ?? '#f59e0b',
        backgroundColor: b.backgroundColor ?? '#ffffff',
        headingFont: b.headingFont ?? 'Plus Jakarta Sans',
        bodyFont: b.bodyFont ?? 'Inter',
        brandPersonality: b.brandPersonality ?? '',
        photoStyle: b.photoStyle ?? '',
        referenceImages: b.referenceImages ?? [],
        trustSignals: b.trustSignals ?? ['cod', 'free_delivery', 'easy_returns'],
      }
      setBrand(loaded)
      setOriginalBrand(loaded)
    }
    if (onboardingData?.preferences) {
      const p = onboardingData.preferences
      const loaded: PrefsState = {
        postsPerDay: (p.postsPerDay as 1 | 2 | 3) ?? 1,
        postingTimes: (p.postingTimes ?? []).filter((t: string) => (VALID_TIME_SLOTS as readonly string[]).includes(t)),
        language: p.language ?? 'english',
        budgetMin: p.budgetMin ?? 200,
        budgetMax: p.budgetMax ?? 500,
        autoApprove: p.autoApprove ?? false,
        inventoryThreshold: p.inventoryThreshold ?? 5,
        smartTiming: p.smartTiming ?? false,
        smartTimingLastCalibrated: p.smartTimingLastCalibrated ?? null,
        smartTimingPostingTimes: p.smartTimingPostingTimes ?? null,
        contentGenerationTime: p.contentGenerationTime ?? '02:00',
        notificationTime: p.notificationTime ?? '08:00',
        hashtagBlacklist: (p.hashtagBlacklist as string[] | null) ?? [],
        bannedWords: (p.bannedWords as string[] | null) ?? [],
        maxEmojiCount: (p.maxEmojiCount as number | null) ?? 5,
        requiredDisclaimers: (p.requiredDisclaimers as Record<string, string> | null) ?? {},
        quietHoursStart: p.quietHoursStart ?? '22:00',
        quietHoursEnd: p.quietHoursEnd ?? '08:00',
        monthlyAdBudgetCap: p.monthlyAdBudgetCap ?? null,
        perProductAdLimit: p.perProductAdLimit ?? null,
        notifyOnPublish: p.notifyOnPublish ?? true,
        notifyOnHold: p.notifyOnHold ?? true,
        notifyOnAdPause: p.notifyOnAdPause ?? true,
        notifyOnWeeklyReport: p.notifyOnWeeklyReport ?? true,
        notifyOnContentGenerated: p.notifyOnContentGenerated ?? false,
        emailDigest: p.emailDigest ?? false,
      }
      setPrefs(loaded)
      setOriginalPrefs(loaded)
    }
  }, [onboardingData])

  useEffect(() => {
    if (festivals.length > 0) {
      const ids = festivals.filter(f => f.isEnabled).map(f => f.id)
      setSelectedFestivalIds(ids)
      setOriginalFestivalIds(ids)
    }
  }, [festivals.length])

  // ── Dirty tracking ─────────────────────────────────────────────────────────
  type PrefsKey = keyof PrefsState
  const sectionFields: Record<'preferences' | 'content' | 'notifications' | 'budget', PrefsKey[]> = {
    preferences:   ['postsPerDay','postingTimes','language','budgetMin','budgetMax','autoApprove','inventoryThreshold','smartTiming','contentGenerationTime','notificationTime'],
    content:       ['hashtagBlacklist','bannedWords','maxEmojiCount','requiredDisclaimers'],
    notifications: ['notifyOnPublish','notifyOnHold','notifyOnAdPause','notifyOnWeeklyReport','notifyOnContentGenerated','emailDigest','quietHoursStart','quietHoursEnd'],
    budget:        ['monthlyAdBudgetCap','perProductAdLimit'],
  }

  const isBrandDirty = originalBrand !== null && JSON.stringify(brand) !== JSON.stringify(originalBrand)

  const isSectionDirty = (section: keyof typeof sectionFields): boolean => {
    if (!originalPrefs) return false
    return sectionFields[section].some(f => JSON.stringify(prefs[f]) !== JSON.stringify(originalPrefs[f]))
  }

  const isFestivalsDirty = JSON.stringify([...selectedFestivalIds].sort()) !== JSON.stringify([...originalFestivalIds].sort())

  const isAnyDirty = isBrandDirty
    || isSectionDirty('preferences')
    || isSectionDirty('content')
    || isSectionDirty('notifications')
    || isSectionDirty('budget')
    || isFestivalsDirty

  const discardAllChanges = () => {
    if (originalBrand)  setBrand({ ...originalBrand })
    if (originalPrefs)  setPrefs({ ...originalPrefs })
    setSelectedFestivalIds([...originalFestivalIds])
  }

  const guardedClose = () => {
    if (isAnyDirty) {
      setUnsavedConfirm({ open: true, onProceed: closeSettings })
    } else {
      closeSettings()
    }
  }

  const guardedSwitchTab = (tabId: string) => {
    if (isAnyDirty && tabId !== activeTab) {
      setUnsavedConfirm({ open: true, onProceed: () => openSettings(tabId) })
    } else {
      openSettings(tabId)
    }
  }

  const cancelSection = (section: keyof typeof sectionFields) => {
    if (!originalPrefs) return
    setPrefs(p => {
      const next = { ...p }
      sectionFields[section].forEach(f => { (next as Record<PrefsKey, unknown>)[f] = originalPrefs[f] })
      return next
    })
  }

  // Keep ref in sync so Escape handler always sees latest dirty state
  useEffect(() => { isAnyDirtyRef.current = isAnyDirty }, [isAnyDirty])

  // Scroll content to top on tab change
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }) }, [activeTab])

  // Escape key — guarded close
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isAnyDirtyRef.current) {
        setUnsavedConfirm({ open: true, onProceed: closeSettings })
      } else {
        closeSettings()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeSettings])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const allPrefsPayload = () => ({
    postsPerDay: prefs.postsPerDay,
    postingTimes: prefs.postingTimes,
    language: prefs.language,
    budgetMin: prefs.budgetMin,
    budgetMax: prefs.budgetMax,
    autoApprove: prefs.autoApprove,
    inventoryThreshold: prefs.inventoryThreshold,
    smartTiming: prefs.smartTiming,
    contentGenerationTime: prefs.contentGenerationTime,
    notificationTime: prefs.notificationTime,
    hashtagBlacklist: prefs.hashtagBlacklist,
    bannedWords: prefs.bannedWords,
    maxEmojiCount: prefs.maxEmojiCount,
    requiredDisclaimers: prefs.requiredDisclaimers,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    monthlyAdBudgetCap: prefs.monthlyAdBudgetCap,
    perProductAdLimit: prefs.perProductAdLimit,
    notifyOnPublish: prefs.notifyOnPublish,
    notifyOnHold: prefs.notifyOnHold,
    notifyOnAdPause: prefs.notifyOnAdPause,
    notifyOnWeeklyReport: prefs.notifyOnWeeklyReport,
    notifyOnContentGenerated: prefs.notifyOnContentGenerated,
    emailDigest: prefs.emailDigest,
  })

  const invalidatePrefs = () => {
    setPreferredLanguage(prefs.language as 'english' | 'hindi' | 'bilingual')
    setOriginalPrefs({ ...prefs })
    queryClient.invalidateQueries({ queryKey: ['shop', 'onboarding-data'] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  const { mutate: saveBrand, isPending: isSavingBrand } = useMutation({
    mutationFn: () => shopService.saveBrandSettings({
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      backgroundColor: brand.backgroundColor,
      headingFont: brand.headingFont,
      bodyFont: brand.bodyFont,
      brandPersonality: brand.brandPersonality,
      photoStyle: brand.photoStyle,
      referenceImages: brand.referenceImages,
      trustSignals: brand.trustSignals,
    }),
    onSuccess: () => { showToast('Brand settings saved', 'success'); setOriginalBrand({ ...brand }); queryClient.invalidateQueries({ queryKey: ['shop', 'onboarding-data'] }) },
    onError: () => showToast('Failed to save brand settings', 'error'),
  })

  const { mutate: savePrefs, isPending: isSavingPrefs } = useMutation({
    mutationFn: () => shopService.savePreferences(allPrefsPayload()),
    onSuccess: () => { showToast('Preferences saved', 'success'); invalidatePrefs() },
    onError: () => showToast('Failed to save preferences', 'error'),
  })

  const { mutate: saveContentControls, isPending: isSavingContent } = useMutation({
    mutationFn: () => shopService.savePreferences(allPrefsPayload()),
    onSuccess: () => { showToast('Content controls saved', 'success'); invalidatePrefs() },
    onError: () => showToast('Failed to save content controls', 'error'),
  })

  const { mutate: saveNotifications, isPending: isSavingNotifications } = useMutation({
    mutationFn: () => shopService.savePreferences(allPrefsPayload()),
    onSuccess: () => { showToast('Notification settings saved', 'success'); invalidatePrefs() },
    onError: () => showToast('Failed to save notification settings', 'error'),
  })

  const { mutate: saveBudgetControls, isPending: isSavingBudget } = useMutation({
    mutationFn: () => shopService.savePreferences(allPrefsPayload()),
    onSuccess: () => { showToast('Budget controls saved', 'success'); invalidatePrefs() },
    onError: () => showToast('Failed to save budget controls', 'error'),
  })

  const { mutate: saveFestivals, isPending: isSavingFestivals } = useMutation({
    mutationFn: () => shopService.saveFestivals({ selectedFestivals: selectedFestivalIds }),
    onSuccess: () => {
      showToast('Festival settings saved', 'success')
      setOriginalFestivalIds([...selectedFestivalIds])
      queryClient.invalidateQueries({ queryKey: ['festivals'] })
      queryClient.invalidateQueries({ queryKey: ['shop', 'onboarding-data'] })
    },
    onError: () => showToast('Failed to save festival settings', 'error'),
  })

  const { mutate: pauseShop, isPending: isPausing } = useMutation({
    mutationFn: (isPaused: boolean) => shopService.pauseShop(isPaused),
    onSuccess: (_d, paused) => {
      showToast(paused ? 'All publishing paused' : 'Publishing resumed', 'success')
      setPauseConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['shop'] })
    },
    onError: () => { showToast('Failed to update pause state', 'error'); setPauseConfirmOpen(false) },
  })

  const setIsShopOnboarded = useShopStore(s => s.setIsShopOnboarded)
  const setOnboardingStep  = useShopStore(s => s.setOnboardingStep)

  const { mutate: resetOnboarding, isPending: isResetting } = useMutation({
    mutationFn: () => shopService.resetOnboarding(),
    onSuccess: () => {
      // Update Zustand store first — otherwise the route guard bounces /onboarding → /
      setIsShopOnboarded(false)
      setOnboardingStep(0)
      showToast('Onboarding reset successfully', 'success')
      setResetConfirmOpen(false)
      closeSettings()
      navigate('/onboarding')
    },
    onError: () => { showToast('Failed to reset onboarding', 'error'); setResetConfirmOpen(false) },
  })

  const { mutate: disconnectSocial, isPending: isDisconnecting } = useMutation({
    mutationFn: () => shopService.disconnectSocial(),
    onSuccess: () => {
      showToast('Social accounts disconnected', 'success')
      setDisconnectConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['shop', 'onboarding-data'] })
    },
    onError: () => { showToast('Failed to disconnect', 'error'); setDisconnectConfirmOpen(false) },
  })

  const social = onboardingData?.social
  const isPaused = shop?.isGlobalPaused ?? false

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={guardedClose}
            />

            {/* Modal panel */}
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'fixed z-50 bg-white shadow-2xl flex overflow-hidden',
                // Mobile: full screen
                'inset-0 rounded-none',
                // Desktop: inset with rounded corners, max width
                'md:inset-8 md:rounded-2xl lg:inset-16',
                'md:max-w-5xl md:mx-auto md:my-auto md:h-auto md:max-h-[calc(100vh-128px)]',
              )}
            >
              {/* ── Left Sidebar ─────────────────────────────────── */}
              <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-zinc-950 text-white relative">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                  <p className="font-display font-bold text-white text-lg">Settings</p>
                  <button
                    onClick={guardedClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    aria-label="Close settings"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tab list */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                  {TABS.map(({ id, label, Icon, danger }) => {
                    const isActive = activeTab === id
                    return (
                      <button
                        key={id}
                        onClick={() => guardedSwitchTab(id)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all cursor-pointer',
                          isActive
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                        )}
                      >
                        <Icon className={cn('w-5 h-5 shrink-0', isActive && danger ? 'text-red-400' : '')} />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-600">VisualFlow AI v1.0</p>
                </div>
              </aside>

              {/* ── Mobile: horizontal tab pills ─────────────────── */}
              <div className="md:hidden absolute top-0 left-0 right-0 z-10 bg-white border-b border-surface-100">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="font-display font-bold text-zinc-900 text-base">Settings</p>
                  <button
                    onClick={guardedClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-surface-100 transition-colors cursor-pointer"
                    aria-label="Close settings"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex overflow-x-auto gap-2 px-4 pb-3 scrollbar-none">
                  {TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => guardedSwitchTab(id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border',
                        activeTab === id
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'text-zinc-500 border-surface-200 hover:border-zinc-300 hover:text-zinc-700',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Right content area ────────────────────────────── */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto bg-white p-6 md:p-8 md:pt-8 pt-32"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTab === 'brand' && (
                      <BrandSettingsTab
                        brand={brand}
                        onChange={setBrand}
                        isDirty={isBrandDirty}
                        isSaving={isSavingBrand}
                        onSave={() => saveBrand()}
                        onCancel={() => { if (originalBrand) setBrand({ ...originalBrand }) }}
                      />
                    )}
                    {activeTab === 'preferences' && (
                      <PostingPreferencesTab
                        prefs={prefs}
                        onChange={setPrefs}
                        isDirty={isSectionDirty('preferences')}
                        isSaving={isSavingPrefs}
                        onSave={() => savePrefs()}
                        onCancel={() => cancelSection('preferences')}
                      />
                    )}
                    {activeTab === 'social' && (
                      <SocialConnectionsTab
                        social={social}
                        onDisconnect={() => setDisconnectConfirmOpen(true)}
                        isDisconnecting={isDisconnecting}
                      />
                    )}
                    {activeTab === 'festivals' && (
                      <FestivalSettingsTab
                        festivals={festivals}
                        selectedFestivalIds={selectedFestivalIds}
                        isSaving={isSavingFestivals}
                        onToggle={id => setSelectedFestivalIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])}
                        onSave={() => saveFestivals()}
                      />
                    )}
                    {activeTab === 'content' && (
                      <ContentControlsTab
                        prefs={prefs}
                        onChange={setPrefs}
                        isDirty={isSectionDirty('content')}
                        isSaving={isSavingContent}
                        onSave={() => saveContentControls()}
                        onCancel={() => cancelSection('content')}
                      />
                    )}
                    {activeTab === 'notifications' && (
                      <NotificationControlsTab
                        prefs={prefs}
                        onChange={setPrefs}
                        isDirty={isSectionDirty('notifications')}
                        isSaving={isSavingNotifications}
                        onSave={() => saveNotifications()}
                        onCancel={() => cancelSection('notifications')}
                      />
                    )}
                    {activeTab === 'budget' && (
                      <BudgetControlsTab
                        prefs={prefs}
                        onChange={setPrefs}
                        isDirty={isSectionDirty('budget')}
                        isSaving={isSavingBudget}
                        onSave={() => saveBudgetControls()}
                        onCancel={() => cancelSection('budget')}
                      />
                    )}
                    {activeTab === 'danger' && (
                      <DangerZoneTab
                        isPaused={isPaused}
                        isPausing={isPausing}
                        isResetting={isResetting}
                        onPauseToggle={() => setPauseConfirmOpen(true)}
                        onResetOnboarding={() => setResetConfirmOpen(true)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Unsaved changes guard ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={unsavedConfirm.open}
        onClose={() => setUnsavedConfirm(s => ({ ...s, open: false }))}
        title="Leave without saving?"
        description="You have unsaved changes on this tab. If you leave now, your changes will be lost."
        confirmText="Leave"
        onConfirm={() => {
          discardAllChanges()
          setUnsavedConfirm(s => ({ ...s, open: false }))
          unsavedConfirm.onProceed()
        }}
      />

      {/* ── Confirm dialogs ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={disconnectConfirmOpen}
        onClose={() => setDisconnectConfirmOpen(false)}
        title="Disconnect Social Accounts?"
        description="This will remove your Facebook and Instagram connection. You will need to reconnect to resume posting."
        confirmText="Disconnect"
        onConfirm={() => disconnectSocial()}
        isConfirming={isDisconnecting}
      />

      <ConfirmDialog
        open={pauseConfirmOpen}
        onClose={() => setPauseConfirmOpen(false)}
        title={isPaused ? 'Resume Publishing?' : 'Pause All Publishing?'}
        description={isPaused ? 'This will resume all scheduled posts and ad campaigns.' : 'This will stop all scheduled posts and ad campaigns immediately.'}
        confirmText={isPaused ? 'Resume' : 'Pause'}
        onConfirm={() => pauseShop(!isPaused)}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Reset Onboarding?"
        description="This will clear your onboarded status and redirect you to the onboarding flow. Your content and data will be preserved."
        confirmText="Reset"
        onConfirm={() => resetOnboarding()}
        isConfirming={isResetting}
      />
    </>
  )
}
