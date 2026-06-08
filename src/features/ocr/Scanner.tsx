import { useCallback, useRef, useState } from 'react'
import { Camera, Upload, Pencil, CheckCircle, AlertCircle, ImagePlus } from 'lucide-react'
import { useRecords } from '@/features/work-records/useRecords'
import { processarOCR } from '@/features/ocr/ocrEngine'
import { parseDataBR } from '@/utils/dateUtils'

// ─── Debug logger (silencioso em produção) ────────────────────────────────────
const DEBUG = import.meta.env.DEV
function dbg(...args: unknown[]) {
  if (DEBUG) console.log('[Scanner]', ...args)
}

type Tab = 'foto' | 'manual'

export function Scanner() {
  const [tab, setTab] = useState<Tab>('foto')
  const { adicionarMarcacao } = useRecords()

  const handleCaptura = useCallback(
    async (dataBR: string, hora: string) => {
      const dataISO = parseDataBR(dataBR)
      dbg('handleCaptura', { dataBR, dataISO, hora })
      await adicionarMarcacao(dataISO, hora, 'ocr')
    },
    [adicionarMarcacao]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-700 px-4">
        {[
          { id: 'foto', label: 'Foto / Upload', icon: Camera },
          { id: 'manual', label: 'Manual', icon: Pencil },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === id
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'foto' && <FotoUpload onCaptura={handleCaptura} />}
        {tab === 'manual' && <ManualEntry onCaptura={handleCaptura} />}
      </div>
    </div>
  )
}

// ─── Tipos da fila ────────────────────────────────────────────────────────────

type StatusItem =
  | 'aguardando'
  | 'processando'
  | 'sucesso'
  | 'confirmacao'
  | 'falha'

interface ItemFila {
  id: number
  file: File
  status: StatusItem
  resultado?: string
  motivoPendencia?: string
  data?: string
  hora?: string
  confianca?: number
  textoBruto?: string
}

// ─── Componente FotoUpload ────────────────────────────────────────────────────

function FotoUpload({ onCaptura }: { onCaptura: (data: string, hora: string) => Promise<void> }) {
  const [fila, setFila] = useState<ItemFila[]>([])
  const [processando, setProcessando] = useState(false)
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 })
  const filaRef = useRef<ItemFila[]>([])
  const contadorId = useRef(0)
  // Deduplicação: evita que dois inputs disparem handleFiles com o mesmo arquivo
  const ultimosArquivos = useRef<string>('')
  const ultimaFilagem = useRef<number>(0)

  // Atualizar item da fila de forma segura
  const atualizarItem = useCallback((id: number, patch: Partial<ItemFila>) => {
    setFila((prev) => {
      const nova = prev.map((item) => item.id === id ? { ...item, ...patch } : item)
      filaRef.current = nova
      return nova
    })
  }, [])

  // Processar uma única imagem
  const processarUmaImagem = async (
    item: ItemFila,
    onCaptura: (data: string, hora: string) => Promise<void>
  ): Promise<void> => {
    dbg(`Iniciando OCR: ${item.file.name}`)
    atualizarItem(item.id, { status: 'processando' })

    let ocr
    try {
      ocr = await processarOCR(item.file)
      dbg('Resultado OCR:', {
        sucesso: ocr.sucesso,
        data: ocr.data,
        hora: ocr.hora,
        confianca: ocr.confianca,
      })
    } catch (err) {
      dbg('Exceção no OCR:', err)
      atualizarItem(item.id, {
        status: 'falha',
        motivoPendencia: 'Erro interno no OCR.',
        resultado: 'Erro no processamento.',
      })
      return
    }

    // Sucesso completo
    if (ocr.sucesso && ocr.data && ocr.hora) {
      try {
        await onCaptura(ocr.data, ocr.hora)
        dbg(`Salvo: ${ocr.data} ${ocr.hora}`)
        atualizarItem(item.id, {
          status: 'sucesso',
          resultado: `${ocr.data} às ${ocr.hora}`,
          data: ocr.data,
          hora: ocr.hora,
          confianca: ocr.confianca,
        })
      } catch (err) {
        dbg('Erro ao salvar registro:', err)
        atualizarItem(item.id, {
          status: 'falha',
          resultado: `${ocr.data} às ${ocr.hora}`,
          motivoPendencia: 'Falha ao salvar no banco.',
        })
      }
      return
    }

    // Parcial — tem data e hora mas confiança baixa
    if (ocr.data && ocr.hora) {
      dbg(`Confiança baixa (${ocr.confianca}%), aguardando confirmação`)
      atualizarItem(item.id, {
        status: 'confirmacao',
        resultado: `${ocr.data} às ${ocr.hora}`,
        motivoPendencia: `Confiança OCR: ${ocr.confianca}%`,
        data: ocr.data,
        hora: ocr.hora,
        confianca: ocr.confianca,
        textoBruto: ocr.texto_bruto,
      })

      // Aguardar decisão do usuário (polling no ref)
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          const atual = filaRef.current.find((i) => i.id === item.id)
          if (atual && atual.status !== 'confirmacao') {
            clearInterval(check)
            resolve()
          }
        }, 300)
      })
      return
    }

    // Sem data ou hora
    const motivo = !ocr.data && !ocr.hora
      ? 'Data e hora não identificadas.'
      : !ocr.data
      ? 'Data não identificada.'
      : 'Hora não identificada.'

    dbg(`Falha: ${motivo}`)
    atualizarItem(item.id, {
      status: 'falha',
      motivoPendencia: motivo,
      resultado: `Não extraído (confiança: ${ocr.confianca}%)`,
      textoBruto: ocr.texto_bruto,
    })
  }

  // Processar fila sequencialmente — uma imagem por vez
  const processarFila = async (arquivos: File[]) => {
    if (processando || arquivos.length === 0) return

    setProcessando(true)

    const novosItens: ItemFila[] = arquivos.map((file) => ({
      id: ++contadorId.current,
      file,
      status: 'aguardando' as StatusItem,
    }))

    // Adicionar todos como aguardando antes de começar
    setFila((prev) => {
      const nova = [...prev, ...novosItens]
      filaRef.current = nova
      return nova
    })

    setProgresso({ atual: 0, total: arquivos.length })

    // Processar sequencialmente — aguardar cada uma antes da próxima
    for (let i = 0; i < novosItens.length; i++) {
      setProgresso({ atual: i + 1, total: arquivos.length })
      await processarUmaImagem(novosItens[i], onCaptura)
    }

    setProgresso({ atual: 0, total: 0 })
    setProcessando(false)
    dbg('Fila concluída')
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const validos = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (validos.length === 0) return

    // Deduplicação: ignora chamada duplicada dentro de 800ms com os mesmos arquivos
    const assinatura = validos.map((f) => `${f.name}|${f.size}|${f.lastModified}`).join(',')
    const agora = Date.now()
    if (assinatura === ultimosArquivos.current && agora - ultimaFilagem.current < 800) {
      dbg('handleFiles ignorado — duplicata detectada')
      return
    }
    ultimosArquivos.current = assinatura
    ultimaFilagem.current = agora

    dbg(`Arquivos recebidos: ${files.length}, válidos: ${validos.length}`)
    processarFila(validos)
  }

  const confirmarItem = async (id: number) => {
    const item = filaRef.current.find((i) => i.id === id)
    if (!item?.data || !item?.hora) return
    try {
      await onCaptura(item.data, item.hora)
      atualizarItem(id, { status: 'sucesso', motivoPendencia: undefined })
    } catch {
      atualizarItem(id, { status: 'falha', motivoPendencia: 'Falha ao salvar após confirmação.' })
    }
  }

  const rejeitarItem = (id: number) => {
    atualizarItem(id, { status: 'falha', motivoPendencia: 'Rejeitado pelo usuário.' })
  }

  const limparFila = () => {
    if (processando) return
    setFila([])
    filaRef.current = []
  }

  // Estatísticas
  const total = fila.length
  const salvos = fila.filter((i) => i.status === 'sucesso').length
  const falhas = fila.filter((i) => i.status === 'falha').length
  const pendentes = fila.filter((i) => i.status === 'confirmacao').length
  const concluido = !processando && total > 0 && (salvos + falhas) >= total - pendentes

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Botões de captura */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tirar Foto — abre câmera traseira diretamente */}
        <label className="btn-primary flex flex-col items-center justify-center gap-2 py-5 cursor-pointer text-center">
          <Camera size={24} />
          <span className="text-sm font-semibold">Tirar Foto</span>
          <span className="text-xs opacity-70">Câmera traseira</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {/* Selecionar da Galeria — múltiplas imagens */}
        <label className="btn-secondary flex flex-col items-center justify-center gap-2 py-5 cursor-pointer text-center">
          <ImagePlus size={24} />
          <span className="text-sm font-semibold">Selecionar</span>
          <span className="text-xs opacity-70">Da galeria</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {/* Progresso durante processamento */}
      {processando && progresso.total > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">
              Processando {progresso.atual} de {progresso.total}
            </span>
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-300"
              style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Resumo final */}
      {concluido && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-slate-400">{total} imagem{total !== 1 ? 'ns' : ''}</span>
            {salvos > 0 && <span className="text-green-400 font-medium">✓ {salvos} salvo{salvos !== 1 ? 's' : ''}</span>}
            {falhas > 0 && <span className="text-red-400 font-medium">✗ {falhas} falha{falhas !== 1 ? 's' : ''}</span>}
            {pendentes > 0 && <span className="text-yellow-400 font-medium">⚠ {pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>}
          </div>
          <button
            onClick={limparFila}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Lista da fila */}
      {fila.length > 0 && (
        <div className="flex flex-col gap-2">
          {fila.map((item) => (
            <div
              key={item.id}
              className={`card flex items-start gap-3 py-3 transition-colors
                ${item.status === 'sucesso' ? 'border-green-700' :
                  item.status === 'falha' ? 'border-red-800' :
                  item.status === 'confirmacao' ? 'border-yellow-600' :
                  item.status === 'processando' ? 'border-blue-700' :
                  'border-slate-700'}`}
            >
              {/* Ícone */}
              <div className="shrink-0 mt-0.5">
                {item.status === 'aguardando' && (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                )}
                {item.status === 'processando' && (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
                {item.status === 'sucesso' && <CheckCircle size={16} className="text-green-400" />}
                {item.status === 'falha' && <AlertCircle size={16} className="text-red-400" />}
                {item.status === 'confirmacao' && <AlertCircle size={16} className="text-yellow-400" />}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 truncate">{item.file.name}</p>

                {item.resultado && (
                  <p className="text-sm font-medium mt-0.5">{item.resultado}</p>
                )}

                {item.motivoPendencia && item.status !== 'sucesso' && (
                  <p className={`text-xs mt-0.5 ${
                    item.status === 'confirmacao' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    Pendente: {item.motivoPendencia}
                  </p>
                )}

                {item.status === 'falha' && item.textoBruto && (
                  <details className="mt-1">
                    <summary className="text-xs text-slate-500 cursor-pointer">
                      Ver texto OCR
                    </summary>
                    <pre className="text-xs text-slate-400 mt-1 whitespace-pre-wrap break-all max-h-24 overflow-y-auto bg-slate-900 rounded p-2">
                      {item.textoBruto}
                    </pre>
                  </details>
                )}
              </div>

              {/* Ações para confirmação */}
              {item.status === 'confirmacao' && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => confirmarItem(item.id)}
                    className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => rejeitarItem(item.id)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg"
                  >
                    Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Manual Entry ─────────────────────────────────────────────────────────────

function ManualEntry({ onCaptura }: { onCaptura: (data: string, hora: string) => Promise<void> }) {
  const hoje = new Date()
  const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`

  const [data, setData] = useState(dataHoje)
  const [hora, setHora] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data || !hora) return
    setLoading(true)
    try {
      const [y, m, d] = data.split('-')
      const dataBR = `${d}/${m}/${y}`
      dbg('Manual entry:', { dataBR, hora })
      await onCaptura(dataBR, hora)
      setSucesso(true)
      setHora('')
      setTimeout(() => setSucesso(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
      <div>
        <label className="text-sm text-slate-400 mb-1 block">Data</label>
        <input
          type="date"
          className="input"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-sm text-slate-400 mb-1 block">Hora</label>
        <input
          type="time"
          className="input text-lg"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading || !hora}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : sucesso ? (
          <><CheckCircle size={16} /> Salvo!</>
        ) : (
          'Registrar Marcação'
        )}
      </button>
    </form>
  )
}
