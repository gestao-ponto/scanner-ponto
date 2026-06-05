import { useState, useEffect } from 'react'
import { LayoutDashboard, ScanLine, Calendar, List, FileDown, Settings } from 'lucide-react'
import { Dashboard } from '@/app/components/dashboard/Dashboard'
import { Scanner } from '@/features/ocr/Scanner'
import { Calendario } from '@/app/components/calendar/Calendario'
import { Registros } from '@/app/components/records/Registros'
import { Exportacao } from '@/app/components/reports/Exportacao'
import { OvertimeModal } from '@/app/components/dashboard/OvertimeModal'
import { Configuracoes } from './Configuracoes'
import { useUIStore } from '@/store'
import { initSyncListener } from '@/features/work-records/syncService'

type Tab = 'dashboard' | 'scanner' | 'calendario' | 'registros' | 'exportar' | 'config'

const TABS = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scanner', icon: ScanLine },
  { id: 'calendario', label: 'Calendário', icon: Calendar },
  { id: 'registros', label: 'Registros', icon: List },
  { id: 'exportar', label: 'Exportar', icon: FileDown },
] as const

const PAGE_TITLES: Record<Tab, string> = {
  dashboard: 'Dashboard',
  scanner: 'Scanner de Ponto',
  calendario: 'Calendário',
  registros: 'Registros',
  exportar: 'Exportar',
  config: 'Configurações',
}

export function AppLayout() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { isOnline, hasPendingSync, setOnline } = useUIStore()

  // Listeners de conectividade
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const cleanup = initSyncListener()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      cleanup()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <h1 className="font-semibold text-slate-100">{PAGE_TITLES[tab]}</h1>
        <div className="flex items-center gap-2">
          {/* Status de conexão */}
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full
            ${isOnline ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-slate-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {hasPendingSync && (
            <div className="text-xs bg-amber-900 text-amber-300 px-2 py-1 rounded-full">
              Sync pendente
            </div>
          )}
          {/* Configurações */}
          <button
            onClick={() => setTab('config')}
            className={`p-1.5 rounded-lg transition-colors
              ${tab === 'config' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'scanner' && <Scanner />}
          {tab === 'calendario' && <Calendario />}
          {tab === 'registros' && <Registros />}
          {tab === 'exportar' && <Exportacao />}
          {tab === 'config' && <Configuracoes />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-800 border-t border-slate-700 shrink-0 pb-safe">
        <div className="flex relative">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors border-t-2
                ${tab === id
                  ? 'text-red-400 border-red-500'
                  : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modal de hora extra (global) */}
      <OvertimeModal />
    </div>
  )
}
