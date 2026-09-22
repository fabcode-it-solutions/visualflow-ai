import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration: number
}

interface NotificationState {
  toasts: Toast[]
  unreadCount: number
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  setUnreadCount: (count: number) => void
  incrementUnread: () => void
  resetUnread: () => void
}

let toastId = 0

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  unreadCount: 0,

  addToast: (toast) => {
    const id = `toast-${++toastId}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, toast.duration)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
}))

export const toast = {
  success: (title: string, description?: string) =>
    useNotificationStore.getState().addToast({
      title, description, variant: 'success', duration: 4000,
    }),
  error: (title: string, description?: string) =>
    useNotificationStore.getState().addToast({
      title, description, variant: 'error', duration: 6000,
    }),
  warning: (title: string, description?: string) =>
    useNotificationStore.getState().addToast({
      title, description, variant: 'warning', duration: 5000,
    }),
  info: (title: string, description?: string) =>
    useNotificationStore.getState().addToast({
      title, description, variant: 'info', duration: 4000,
    }),
}
