import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createDemoRenovation, createEmptyRenovation } from '../lib/demo'
import { PALETTE } from '../lib/palette'
import { toISODate } from '../lib/scheduling'
import type { Professional, Renovation, Step, StepStatus, ZoomLevel } from '../types'

export type Theme = 'light' | 'dark'

export type SyncStatus = 'unavailable' | 'signed-out' | 'connecting' | 'syncing' | 'synced' | 'error'

export interface SyncUserInfo {
  email: string
  displayName: string
  photoURL: string | null
}

export interface Notice {
  id: number
  tone: 'success' | 'error' | 'info'
  message: string
}

interface StoreState {
  renovation: Renovation
  theme: Theme
  zoom: ZoomLevel
  sidebarOpen: boolean
  printing: boolean
  notice: Notice | null

  syncStatus: SyncStatus
  syncUser: SyncUserInfo | null
  /** Timestamp of the cloud revision this app knows about (0 = never synced). */
  syncUpdatedAt: number
  /** Timestamp of the last local edit (0 = untouched since load). */
  localUpdatedAt: number

  setProjectName: (name: string) => void
  setStartDate: (iso: string) => void
  setDurationDays: (days: number) => void

  addProfessional: (data: Omit<Professional, 'id'>) => void
  updateProfessional: (id: string, patch: Partial<Omit<Professional, 'id'>>) => void
  removeProfessional: (id: string) => void

  addStep: (data: Omit<Step, 'id'>) => void
  updateStep: (id: string, patch: Partial<Omit<Step, 'id'>>) => void
  removeStep: (id: string) => void
  setStepStatus: (id: string, status: StepStatus) => void

  replaceRenovation: (renovation: Renovation) => void
  clearAll: () => void

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setZoom: (zoom: ZoomLevel) => void
  toggleSidebar: () => void
  setPrinting: (printing: boolean) => void

  setSyncStatus: (status: SyncStatus) => void
  setSyncUser: (user: SyncUserInfo | null) => void
  setSyncUpdatedAt: (updatedAt: number) => void
  setLocalUpdatedAt: (updatedAt: number) => void
  applyRemoteRenovation: (renovation: Renovation, updatedAt: number) => void

  notify: (tone: Notice['tone'], message: string) => void
  clearNotice: () => void
}

const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)

let noticeCounter = 0

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      renovation: createDemoRenovation(),
      theme:
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
      zoom: 'normal',
      sidebarOpen: true,
      printing: false,
      notice: null,

      syncStatus: 'unavailable',
      syncUser: null,
      syncUpdatedAt: 0,
      localUpdatedAt: 0,

      setProjectName: (name) =>
        set((state) => ({ renovation: { ...state.renovation, name } })),

      setStartDate: (iso) =>
        set((state) => {
          if (!iso || iso === state.renovation.startDate) return {}
          const delta = differenceInCalendarDays(parseISO(iso), parseISO(state.renovation.startDate))
          return {
            renovation: {
              ...state.renovation,
              startDate: iso,
              // Moving the project start shifts every step along with it.
              steps: state.renovation.steps.map((step) => ({
                ...step,
                startDate: toISODate(addDays(parseISO(step.startDate), delta)),
              })),
            },
          }
        }),

      setDurationDays: (days) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            durationDays: Math.min(728, Math.max(1, Math.round(days))),
          },
        })),

      addProfessional: (data) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            professionals: [
              ...state.renovation.professionals,
              {
                ...data,
                id: uid(),
                color:
                  data.color ||
                  PALETTE[state.renovation.professionals.length % PALETTE.length],
              },
            ],
          },
        })),

      updateProfessional: (id, patch) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            professionals: state.renovation.professionals.map((professional) =>
              professional.id === id ? { ...professional, ...patch } : professional,
            ),
          },
        })),

      removeProfessional: (id) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            professionals: state.renovation.professionals.filter(
              (professional) => professional.id !== id,
            ),
            steps: state.renovation.steps.map((step) =>
              step.professionalId === id ? { ...step, professionalId: null } : step,
            ),
          },
        })),

      addStep: (data) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            steps: [...state.renovation.steps, { ...data, id: uid() }],
          },
        })),

      updateStep: (id, patch) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            steps: state.renovation.steps.map((step) =>
              step.id === id ? { ...step, ...patch } : step,
            ),
          },
        })),

      removeStep: (id) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            steps: state.renovation.steps.filter((step) => step.id !== id),
          },
        })),

      setStepStatus: (id, status) =>
        set((state) => ({
          renovation: {
            ...state.renovation,
            steps: state.renovation.steps.map((step) =>
              step.id === id ? { ...step, status } : step,
            ),
          },
        })),

      replaceRenovation: (renovation) => set({ renovation }),
      clearAll: () => set({ renovation: createEmptyRenovation() }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setZoom: (zoom) => set({ zoom }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setPrinting: (printing) => set({ printing }),

      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setSyncUser: (syncUser) => set({ syncUser }),
      setSyncUpdatedAt: (syncUpdatedAt) => set({ syncUpdatedAt }),
      setLocalUpdatedAt: (localUpdatedAt) => set({ localUpdatedAt }),
      applyRemoteRenovation: (renovation, updatedAt) =>
        set({ renovation, syncUpdatedAt: updatedAt, localUpdatedAt: updatedAt }),

      notify: (tone, message) => set({ notice: { id: (noticeCounter += 1), tone, message } }),
      clearNotice: () => set({ notice: null }),
    }),
    {
      name: 'renovation-schedule',
      version: 1,
      partialize: (state) => ({
        renovation: state.renovation,
        theme: state.theme,
        zoom: state.zoom,
        sidebarOpen: state.sidebarOpen,
        syncUpdatedAt: state.syncUpdatedAt,
        localUpdatedAt: state.localUpdatedAt,
      }),
    },
  ),
)
