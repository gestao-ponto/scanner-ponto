import { useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { useRecordsStore, useAuthStore, useOvertimeModal } from '@/store'
import { adicionarRegistro, getRegistrosPeriodo, excluirRegistro } from '@/features/work-records/recordsService'
import { calcularResumoDiario, precisaAutorizacao, calcularHorarioAutorizacao } from '@/features/work-records/calculations'
import { agruparPorDia } from '@/features/work-records/calculations'
import {
  marcarTurnoEspecial as marcarTurnoEspecialService,
  desmarcarTurnoEspecial as desmarcarTurnoEspecialService,
  getTurnoEspecialPeriodo,
} from '@/features/work-records/turnoEspecialService'
import type { OrigemMarcacao } from '@/types'

export function useRecords() {
  const { userId } = useAuthStore()
  const {
    records,
    summaries,
    periodo,
    isLoading,
    diasEspeciais,
    setRecords,
    addRecord,
    removeRecord,
    setLoading,
    setLastSync,
    setPeriodo,
    setDiasEspeciais,
  } = useRecordsStore()
  const { openModal, diasIgnorados } = useOvertimeModal()

  // Carregar registros do período atual
  const carregarRegistros = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const inicio = format(periodo.inicio, 'yyyy-MM-dd')
      const fim = format(periodo.fim, 'yyyy-MM-dd')
      const [data, especiais] = await Promise.all([
        getRegistrosPeriodo(userId, inicio, fim),
        getTurnoEspecialPeriodo(userId, inicio, fim),
      ])
      setDiasEspeciais(especiais)
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
      const resumo = calcularResumoDiario(recordsDia, diasEspeciais.has(data))

      if (precisaAutorizacao(resumo) && !diasIgnorados.includes(data)) {
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
    [userId, addRecord, openModal, diasIgnorados, diasEspeciais]
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

  // Marcar/desmarcar turno especial (jornada padrão não se aplica no dia)
  const marcarTurnoEspecial = useCallback(
    async (data: string) => {
      if (!userId) return
      await marcarTurnoEspecialService(userId, data)
      setDiasEspeciais(new Set([...diasEspeciais, data]))
    },
    [userId, diasEspeciais, setDiasEspeciais]
  )

  const desmarcarTurnoEspecial = useCallback(
    async (data: string) => {
      if (!userId) return
      await desmarcarTurnoEspecialService(userId, data)
      const novo = new Set(diasEspeciais)
      novo.delete(data)
      setDiasEspeciais(novo)
    },
    [userId, diasEspeciais, setDiasEspeciais]
  )

  // Dias pendentes (dias úteis sem marcações)
  const diasPendentes = summaries.filter((s) => s.status === 'ausente' || s.status === 'incompleto')

  return {
    records,
    summaries,
    periodo,
    isLoading,
    diasPendentes,
    diasEspeciais,
    adicionarMarcacao,
    excluirMarcacao,
    marcarTurnoEspecial,
    desmarcarTurnoEspecial,
    recarregar: carregarRegistros,
    setPeriodo,
  }
}
