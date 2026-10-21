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
  diasEspeciais: Set<string>
  setRecords: (records: WorkRecord[]) => void
  addRecord: (record: WorkRecord) => void
  removeRecord: (id: string) => void
  setPeriodo: (p: Periodo) => void
  setLoading: (v: boolean) => void
  setLastSync: (t: string) => void
  setDiasEspeciais: (dias: Set<string>) => void
  recalcularSummaries: () => void
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  summaries: [],
  periodo: getPeriodoAtual(),
  isLoading: false,
  lastSync: null,
  diasEspeciais: new Set(),

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

  setDiasEspeciais: (dias) => {
    set({ diasEspeciais: dias })
    get().recalcularSummaries()
  },

  recalcularSummaries: () => {
    const { records, diasEspeciais } = get()
    const agrupado = agruparPorDia(records)
    const summaries: DailySummary[] = []

    agrupado.forEach((recs, data) => {
      const resumo = calcularResumoDiario(recs, diasEspeciais.has(data))
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
  diasIgnorados: string[]
  openModal: (params: {
    data: string
    inicioHora: string
    fimHora: string
    bancoMinutos: number
    extraMinutos: number
    intrajornada: boolean
  }) => void
  closeModal: () => void
  ignorarDia: (data: string) => void
}

export const useOvertimeModal = create<OvertimeModalState>((set) => ({
  isOpen: false,
  data: null,
  inicioHora: null,
  fimHora: null,
  bancoMinutos: 0,
  extraMinutos: 0,
  intrajornada: false,
  diasIgnorados: [],
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
  ignorarDia: (data) =>
    set((state) => ({
      diasIgnorados: state.diasIgnorados.includes(data)
        ? state.diasIgnorados
        : [...state.diasIgnorados, data],
      isOpen: false,
      data: null,
      inicioHora: null,
      fimHora: null,
      bancoMinutos: 0,
      extraMinutos: 0,
      intrajornada: false,
    })),
}))

// ─── UI state ─────────────────────────────────────────────────────────────────

interface Toast {
  mensagem: string
  tipo: 'sucesso' | 'erro'
}

interface UIState {
  isOnline: boolean
  hasPendingSync: boolean
  navigateTo: string | null
  atualizacaoDisponivel: boolean
  toast: Toast | null
  setOnline: (v: boolean) => void
  setHasPendingSync: (v: boolean) => void
  setNavigateTo: (t: string | null) => void
  setAtualizacaoDisponivel: (v: boolean) => void
  mostrarToast: (mensagem: string, tipo?: Toast['tipo']) => void
  limparToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: navigator.onLine,
  hasPendingSync: false,
  navigateTo: null,
  atualizacaoDisponivel: false,
  toast: null,
  setOnline: (v) => set({ isOnline: v }),
  setHasPendingSync: (v) => set({ hasPendingSync: v }),
  setNavigateTo: (t) => set({ navigateTo: t }),
  setAtualizacaoDisponivel: (v) => set({ atualizacaoDisponivel: v }),
  mostrarToast: (mensagem, tipo = 'sucesso') => set({ toast: { mensagem, tipo } }),
  limparToast: () => set({ toast: null }),
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