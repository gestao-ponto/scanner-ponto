import { useState, useEffect } from 'react'
import { LayoutDashboard, ScanLine, Calendar, List, FileDown, Settings, Sun, Moon } from 'lucide-react'
import { Dashboard } from '@/app/components/dashboard/Dashboard'
import { Scanner } from '@/features/ocr/Scanner'
import { Calendario } from '@/app/components/calendar/Calendario'
import { Registros } from '@/app/components/records/Registros'
import { Exportacao } from '@/app/components/reports/Exportacao'
import { OvertimeModal } from '@/app/components/dashboard/OvertimeModal'
import { Configuracoes } from './Configuracoes'
import { useUIStore, useThemeStore } from '@/store'
import { initSyncListener } from '@/features/work-records/syncService'

type Tab = 'dashboard' | 'scanner' | 'calendario' | 'registros' | 'exportar' | 'config'

const TABS = [
  { id: 'dashboard',  label: 'Início',     icon: LayoutDashboard },
  { id: 'scanner',    label: 'Scanner',    icon: ScanLine },
  { id: 'calendario', label: 'Calendário', icon: Calendar },
  { id: 'registros',  label: 'Registros',  icon: List },
  { id: 'exportar',   label: 'Exportar',   icon: FileDown },
] as const

const PAGE_TITLES: Record<Tab, string> = {
  dashboard:  'Ponto SENAI',
  scanner:    'Scanner de Ponto',
  calendario: 'Calendário',
  registros:  'Registros',
  exportar:   'Exportar',
  config:     'Configurações',
}

// Ícone de impressão digital (igual ao mockup)
function FingerprintIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
      <path d="M2 12a10 10 0 0 1 18-6"/>
      <path d="M2 17.5C4 17 6.64 15.5 8 13"/>
      <path d="M20.56 18.56A10 10 0 0 0 22 12"/>
      <path d="M6 10a6 6 0 0 1 12 0"/>
      <path d="M4.35 15.35A6 6 0 0 1 6 10"/>
    </svg>
  )
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
    <div className="flex flex-col h-screen max-h-screen"
      style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--border-soft)' }}>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white"
            style={{ background: '#dc2626' }}>
            <FingerprintIcon size={15} />
          </div>
          <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {PAGE_TITLES[tab]}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Online status */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'var(--online-bg)', border: '1px solid var(--online-border)' }}>
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
              background: tab === 'config' ? '#dc2626' : 'var(--bg-overlay)',
              border: `1px solid ${tab === 'config' ? '#dc2626' : 'var(--border)'}`,
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
                <Icon size={20} style={{ color: active ? '#dc2626' : 'var(--text-faint)' }} />
                <span className="text-[10px] font-medium"
                  style={{ color: active ? '#dc2626' : 'var(--text-faint)' }}>
                  {label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#dc2626' }} />
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
