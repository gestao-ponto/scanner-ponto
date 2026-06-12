import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Profile, WorkRecord, DailySummary, Periodo } from '@/types'
import { getPeriodoAtual } from '@/utils/dateUtils'
import { calcularResumoDiario, agruparPorDia, calcularTotaisPeriodo } from '@/features/work-records/calculations'

// ─── Auth state ───────────────────────────────────────────────────────────────

interface AuthState {
  userId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  profile: Profile | null
  setUserId: (id: string | null) => void
  setProfile: (p: Profile | null) => void
  setLoading: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  isAuthenticated: false,
  isLoading: true,
  profile: null,
  setUserId: (id) => set({ userId: id, isAuthenticated: !!id }),
  setProfile: (p) => set({ profile: p }),
  setLoading: (v) => set({ isLoading: v }),
  logout: () => set({ userId: null, isAuthenticated: false, profile: null }),
}))

// ─── Records state ────────────────────────────────────────────────────────────

interface RecordsState {
  records: WorkRecord[]
  summaries: DailySummary[]
  periodo: Periodo
  isLoading: boolean
  lastSync: string | null
  setRecords: (records: WorkRecord[]) => void
  addRecord: (record: WorkRecord) => void
  removeRecord: (id: string) => void
  setPeriodo: (p: Periodo) => void
  setLoading: (v: boolean) => void
  setLastSync: (t: string) => void
  recalcularSummaries: () => void
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  summaries: [],
  periodo: getPeriodoAtual(),
  isLoading: false,
  lastSync: null,

  setRecords: (records) => {
    set({ records })
    get().recalcularSummaries()
  },

  addRecord: (record) => {
    const records = [...get().records, record].sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data)
      return a.hora.localeCompare(b.hora)
    })
    set({ records })
    get().recalcularSummaries()
  },

  removeRecord: (id) => {
    set({ records: get().records.filter((r) => r.id !== id) })
    get().recalcularSummaries()
  },

  setPeriodo: (p) => set({ periodo: p }),
  setLoading: (v) => set({ isLoading: v }),
  setLastSync: (t) => set({ lastSync: t }),

  recalcularSummaries: () => {
    const { records } = get()
    const agrupado = agruparPorDia(records)
    const summaries: DailySummary[] = []

    agrupado.forEach((recs, data) => {
      const resumo = calcularResumoDiario(recs)
      summaries.push({
        id: `summary-${data}`,
        user_id: recs[0]?.user_id ?? '',
        ...resumo,
      })
    })

    set({ summaries: summaries.sort((a, b) => a.data.localeCompare(b.data)) })
  },
}))

// ─── Overtime modal state ─────────────────────────────────────────────────────

interface OvertimeModalState {
  isOpen: boolean
  data: string | null
  inicioHora: string | null
  fimHora: string | null
  bancoMinutos: number
  extraMinutos: number
  intrajornada: boolean
  openModal: (params: {
    data: string
    inicioHora: string
    fimHora: string
    bancoMinutos: number
    extraMinutos: number
    intrajornada: boolean
  }) => void
  closeModal: () => void
}

export const useOvertimeModal = create<OvertimeModalState>((set) => ({
  isOpen: false,
  data: null,
  inicioHora: null,
  fimHora: null,
  bancoMinutos: 0,
  extraMinutos: 0,
  intrajornada: false,
  openModal: (params) => set({ isOpen: true, ...params }),
  closeModal: () =>
    set({
      isOpen: false,
      data: null,
      inicioHora: null,
      fimHora: null,
      bancoMinutos: 0,
      extraMinutos: 0,
      intrajornada: false,
    }),
}))

// ─── UI state ─────────────────────────────────────────────────────────────────

interface UIState {
  isOnline: boolean
  hasPendingSync: boolean
  navigateTo: string | null
  setOnline: (v: boolean) => void
  setHasPendingSync: (v: boolean) => void
  setNavigateTo: (t: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: navigator.onLine,
  hasPendingSync: false,
  navigateTo: null,
  setOnline: (v) => set({ isOnline: v }),
  setHasPendingSync: (v) => set({ hasPendingSync: v }),
  setNavigateTo: (t) => set({ navigateTo: t }),
}))

// ─── Theme state ──────────────────────────────────────────────────────────────

interface ThemeState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.setAttribute('data-theme', next)
      },
    }),
    { name: 'ponto-theme', storage: createJSONStorage(() => localStorage) }
  )
)