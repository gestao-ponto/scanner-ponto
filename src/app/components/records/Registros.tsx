import { useState, useMemo } from 'react'
import { Trash2, Filter } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import { formatDataBR } from '@/utils/dateUtils'
import type { WorkRecord } from '@/types'

type Filtro = 'todos' | 'pendentes' | 'extras'

export function Registros() {
  const { records, summaries, excluirMarcacao } = useRecords()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const diasComExtra   = useMemo(() => new Set(summaries.filter(s => s.hora_extra > 0 || s.banco_horas > 0).map(s => s.data)), [summaries])
  const diasPendentes  = useMemo(() => new Set(summaries.filter(s => s.status === 'incompleto' || s.status === 'ausente').map(s => s.data)), [summaries])

  const registrosFiltrados = useMemo(() => {
    let lista = [...records]
    if (filtro === 'extras')    lista = lista.filter(r => diasComExtra.has(r.data))
    if (filtro === 'pendentes') lista = lista.filter(r => diasPendentes.has(r.data))
    if (busca) {
      const q = busca.toLowerCase()
      lista = lista.filter(r =>
        formatDataBR(r.data).includes(q) || r.hora.includes(q) || labelTipo(r.tipo).toLowerCase().includes(q)
      )
    }
    return lista.sort((a, b) => {
      if (a.data !== b.data) return b.data.localeCompare(a.data)
      return a.hora.localeCompare(b.hora)
    })
  }, [records, filtro, busca, diasComExtra, diasPendentes])

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await excluirMarcacao(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: 'todos',     label: 'Todos' },
    { id: 'pendentes', label: 'Pendentes' },
    { id: 'extras',    label: 'Com extra' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <input type="text" className="input" placeholder="Buscar por data ou hora..."
          value={busca} onChange={e => setBusca(e.target.value)} />

        <div className="flex gap-2">
          {FILTROS.map(({ id, label }) => (
            <button key={id} onClick={() => setFiltro(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: filtro === id ? '#C0392B' : 'var(--bg-overlay)',
                color:      filtro === id ? '#fff' : 'var(--text-secondary)',
                border:     `1px solid ${filtro === id ? '#C0392B' : 'var(--border)'}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {registrosFiltrados.length} registros
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40"
            style={{ color: 'var(--text-faint)' }}>
            <Filter size={24} className="mb-2" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div>
            {registrosFiltrados.map((record) => (
              <RecordRow key={record.id} record={record}
                confirmDelete={confirmDelete === record.id}
                onDelete={() => handleDelete(record.id)}
                hasExtra={diasComExtra.has(record.data)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecordRow({ record, confirmDelete, onDelete, hasExtra }: {
  record: WorkRecord
  confirmDelete: boolean
  onDelete: () => void
  hasExtra: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      <div className="w-20 shrink-0">
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {formatDataBR(record.data)}
        </p>
      </div>
      <div className="w-14 shrink-0">
        <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          {record.hora.slice(0, 5)}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {labelTipo(record.tipo)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="badge-gray">{record.origem}</span>
          {hasExtra && <span className="badge-blue">extra</span>}
          {!record.sincronizado && <span className="badge-yellow">pendente</span>}
        </div>
      </div>
      <button onClick={onDelete}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
        style={{
          background: confirmDelete ? '#C0392B' : 'transparent',
          border: `1px solid ${confirmDelete ? '#C0392B' : 'var(--border)'}`,
          color: confirmDelete ? '#fff' : 'var(--text-muted)',
        }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function labelTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    entrada_manha: 'Entrada manhã',
    saida_manha:   'Saída manhã',
    entrada_tarde: 'Entrada tarde',
    saida_tarde:   'Saída tarde',
    entrada_noite: 'Entrada noite',
    saida_noite:   'Saída noite',
  }
  return mapa[tipo] ?? tipo
}
