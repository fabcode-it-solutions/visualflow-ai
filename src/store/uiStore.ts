import { create } from 'zustand'

interface UIState {
  /** Whether the mobile sidebar/nav is open */
  isSidebarOpen: boolean
  /** Current active modal (null = none open) */
  activeModal: string | null
  /** Global loading overlay visible */
  isGlobalLoading: boolean
  /** Search query in the current page */
  searchQuery: string
  /** Whether the app is in compact/mobile layout */
  isMobile: boolean
  /** Whether the settings modal is open */
  isSettingsOpen: boolean
  /** Active tab inside the settings modal */
  activeSettingsTab: string

  // Actions
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void
  openModal: (modalId: string) => void
  closeModal: () => void
  setGlobalLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setIsMobile: (isMobile: boolean) => void
  openSettings: (tab?: string) => void
  closeSettings: () => void
  reset: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  isGlobalLoading: false,
  searchQuery: '',
  isMobile: false,
  isSettingsOpen: false,
  activeSettingsTab: 'brand',

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsMobile: (isMobile) => set({ isMobile }),
  openSettings: (tab = 'brand') => set({ isSettingsOpen: true, activeSettingsTab: tab }),
  closeSettings: () => set({ isSettingsOpen: false }),
  reset: () =>
    set({
      isSidebarOpen: false,
      activeModal: null,
      isGlobalLoading: false,
      searchQuery: '',
      isMobile: false,
      isSettingsOpen: false,
      activeSettingsTab: 'brand',
    }),
}))
