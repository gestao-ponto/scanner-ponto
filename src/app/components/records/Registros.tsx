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

  const diasComExtra = useMemo(
    () => new Set(summaries.filter((s) => s.hora_extra > 0 || s.banco_horas > 0).map((s) => s.data)),
    [summaries]
  )
  const diasPendentes = useMemo(
    () => new Set(summaries.filter((s) => s.status === 'incompleto' || s.status === 'ausente').map((s) => s.data)),
    [summaries]
  )

  const registrosFiltrados = useMemo(() => {
    let lista = [...records]

    if (filtro === 'extras') lista = lista.filter((r) => diasComExtra.has(r.data))
    if (filtro === 'pendentes') lista = lista.filter((r) => diasPendentes.has(r.data))

    if (busca) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (r) =>
          formatDataBR(r.data).includes(q) ||
          r.hora.includes(q) ||
          labelTipo(r.tipo).toLowerCase().includes(q)
      )
    }

    return lista.sort((a, b) => {
      if (a.data !== b.data) return b.data.localeCompare(a.data) // mais recente primeiro
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

  return (
    <div className="flex flex-col h-full">
      {/* Filtros */}
      <div className="p-4 space-y-3">
        <input
          type="text"
          className="input"
          placeholder="Buscar por data ou hora..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="flex gap-2">
          {([
            { id: 'todos', label: 'Todos' },
            { id: 'pendentes', label: 'Pendentes' },
            { id: 'extras', label: 'Com extra' },
          ] as { id: Filtro; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filtro === id ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contagem */}
      <div className="px-4 pb-2">
        <p className="text-xs text-slate-400">{registrosFiltrados.length} registros</p>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto">
        {registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Filter size={24} className="mb-2" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {registrosFiltrados.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                confirmDelete={confirmDelete === record.id}
                onDelete={() => handleDelete(record.id)}
                hasExtra={diasComExtra.has(record.data)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecordRow({
  record,
  confirmDelete,
  onDelete,
  hasExtra,
}: {
  record: WorkRecord
  confirmDelete: boolean
  onDelete: () => void
  hasExtra: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors">
      {/* Data */}
      <div className="w-20 shrink-0">
        <p className="text-sm font-mono font-semibold">{formatDataBR(record.data)}</p>
      </div>

      {/* Hora */}
      <div className="w-14 shrink-0">
        <p className="text-base font-mono font-bold">{record.hora}</p>
      </div>

      {/* Tipo e origem */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate">{labelTipo(record.tipo)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="badge-gray">{record.origem}</span>
          {hasExtra && <span className="badge-blue">extra</span>}
          {!record.sincronizado && <span className="badge-yellow">pendente sync</span>}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className={`shrink-0 p-1.5 rounded-lg transition-colors
          ${confirmDelete
            ? 'bg-red-600 text-white'
            : 'text-slate-500 hover:text-red-400 hover:bg-slate-700'}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function labelTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    entrada_manha: 'Entrada manhã',
    saida_manha: 'Saída manhã',
    entrada_tarde: 'Entrada tarde',
    saida_tarde: 'Saída tarde',
    entrada_noite: 'Entrada noite',
    saida_noite: 'Saída noite',
  }
  return mapa[tipo] ?? tipo
}
