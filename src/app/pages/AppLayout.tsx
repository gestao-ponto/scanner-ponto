import { useState, useEffect } from 'react'
import { LayoutDashboard, ScanLine, Calendar, List, FileDown, Settings } from 'lucide-react'
import { Dashboard } from '@/app/components/dashboard/Dashboard'
import { Scanner } from '@/features/ocr/Scanner'
import { Calendario } from '@/app/components/calendar/Calendario'
import { Registros } from '@/app/components/records/Registros'
import { Exportacao } from '@/app/components/reports/Exportacao'
import { OvertimeModal } from '@/app/components/dashboard/OvertimeModal'
import { Configuracoes } from './Configuracoes'
import { useUIStore, useThemeStore } from '@/store'
import { initSyncListener } from '@/features/work-records/syncService'
import { Sun, Moon } from 'lucide-react'

type Tab = 'dashboard' | 'scanner' | 'calendario' | 'registros' | 'exportar' | 'config'

const TABS = [
  { id: 'dashboard', label: 'Início',     icon: LayoutDashboard },
  { id: 'scanner',   label: 'Scanner',    icon: ScanLine },
  { id: 'calendario',label: 'Calendário', icon: Calendar },
  { id: 'registros', label: 'Registros',  icon: List },
  { id: 'exportar',  label: 'Exportar',   icon: FileDown },
] as const

const PAGE_TITLES: Record<Tab, string> = {
  dashboard:  'Ponto SENAI',
  scanner:    'Scanner de Ponto',
  calendario: 'Calendário',
  registros:  'Registros',
  exportar:   'Exportar',
  config:     'Configurações',
}

export function AppLayout() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { isOnline, hasPendingSync, setOnline } = useUIStore()
  const { theme, toggleTheme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const handleOnline  = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    const cleanup = initSyncListener()
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      cleanup()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen max-h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--border-soft)' }}>

        <div className="flex items-center gap-2.5">
          {/* Ícone do app */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#C0392B' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              className="w-4 h-4">
              <path d="M12 2C8 2 5 5.5 5 9c0 2.5 1.5 4.7 3.7 5.7L8 18h8l-.7-3.3C17.5 13.7 19 11.5 19 9c0-3.5-3-7-7-7z"/>
              <path d="M9 21h6M10 18v3M14 18v3"/>
              <circle cx="12" cy="9" r="2"/>
            </svg>
          </div>
          <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {PAGE_TITLES[tab]}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Online status */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: 'var(--online-bg)',
              border: '1px solid var(--online-border)',
            }}>
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: isOnline ? 'var(--online-dot)' : 'var(--text-faint)' }} />
            <span style={{ color: isOnline ? 'var(--online-text)' : 'var(--text-faint)' }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {hasPendingSync && (
            <div className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' }}>
              Sync
            </div>
          )}

          {/* Toggle tema */}
          <button onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}
            aria-label="Alternar tema">
            {theme === 'dark'
              ? <Sun size={14} style={{ color: 'var(--text-muted)' }} />
              : <Moon size={14} style={{ color: 'var(--text-muted)' }} />}
          </button>

          {/* Config */}
          <button onClick={() => setTab('config')}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{
              background: tab === 'config' ? '#C0392B' : 'var(--bg-overlay)',
              border: `1px solid ${tab === 'config' ? '#C0392B' : 'var(--border)'}`,
            }}>
            <Settings size={14} style={{ color: tab === 'config' ? '#fff' : 'var(--text-muted)' }} />
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {tab === 'dashboard'  && <Dashboard />}
          {tab === 'scanner'    && <Scanner />}
          {tab === 'calendario' && <Calendario />}
          {tab === 'registros'  && <Registros />}
          {tab === 'exportar'   && <Exportacao />}
          {tab === 'config'     && <Configuracoes />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 pb-safe"
        style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}>
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id as Tab)}
                className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors relative">
                <Icon size={20} style={{ color: active ? '#C0392B' : 'var(--text-faint)' }} />
                <span className="text-[10px] font-medium"
                  style={{ color: active ? '#C0392B' : 'var(--text-faint)' }}>
                  {label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#C0392B' }} />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <OvertimeModal />
    </div>
  )
}
