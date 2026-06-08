import { useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { useRecordsStore, useAuthStore, useOvertimeModal } from '@/store'
import { adicionarRegistro, getRegistrosPeriodo, excluirRegistro } from '@/features/work-records/recordsService'
import { calcularResumoDiario, precisaAutorizacao, calcularHorarioAutorizacao } from '@/features/work-records/calculations'
import { agruparPorDia } from '@/features/work-records/calculations'
import type { OrigemMarcacao } from '@/types'

export function useRecords() {
  const { userId } = useAuthStore()
  const {
    records,
    summaries,
    periodo,
    isLoading,
    setRecords,
    addRecord,
    removeRecord,
    setLoading,
    setLastSync,
  } = useRecordsStore()
  const { openModal } = useOvertimeModal()

  // Carregar registros do período atual
  const carregarRegistros = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const inicio = format(periodo.inicio, 'yyyy-MM-dd')
      const fim = format(periodo.fim, 'yyyy-MM-dd')
      const data = await getRegistrosPeriodo(userId, inicio, fim)
      setRecords(data)
      setLastSync(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [userId, periodo])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  // Adicionar nova marcação
  // Ref para acessar records sem torná-lo dependência do useCallback
  const recordsRef = useRef(records)
  useEffect(() => { recordsRef.current = records }, [records])

  const adicionarMarcacao = useCallback(
    async (data: string, hora: string, origem: OrigemMarcacao) => {
      if (!userId) throw new Error('Usuário não autenticado')

      const record = await adicionarRegistro(userId, data, hora, origem)
      addRecord(record)

      // Verificar se o dia agora tem banco de horas ou hora extra
      // Usa recordsRef para ler o estado atual sem closure stale
      const agrupado = agruparPorDia([
        ...recordsRef.current.filter((r) => r.data === data),
        record,
      ])

      const recordsDia = agrupado.get(data) ?? []
      const resumo = calcularResumoDiario(recordsDia)

      if (precisaAutorizacao(resumo)) {
        const horario = calcularHorarioAutorizacao(recordsDia)
        if (horario) {
          openModal({
            data,
            inicioHora: horario.inicio,
            fimHora: horario.fim,
            bancoMinutos: resumo.banco_horas,
            extraMinutos: resumo.hora_extra,
            intrajornada: resumo.intrajornada > 0,
          })
        }
      }

      return record
    },
    [userId, addRecord, openModal]
  )

  // Excluir marcação
  const excluirMarcacao = useCallback(
    async (id: string) => {
      if (!userId) return
      await excluirRegistro(userId, id)
      removeRecord(id)
    },
    [userId, removeRecord]
  )

  // Dias pendentes (dias úteis sem marcações)
  const diasPendentes = summaries.filter((s) => s.status === 'ausente' || s.status === 'incompleto')

  return {
    records,
    summaries,
    periodo,
    isLoading,
    diasPendentes,
    adicionarMarcacao,
    excluirMarcacao,
    recarregar: carregarRegistros,
  }
}
