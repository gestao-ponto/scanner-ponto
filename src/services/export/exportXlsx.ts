/**
 * Exportador XLSX — Autorização de Horas Extras
 *
 * Estratégia: carrega o template binário original (copiado para /public),
 * preenche APENAS as células A, B, C, D, I nas linhas 16→60,
 * e o cabeçalho B8, I8, B9, B11, I11.
 * Todas as fórmulas E, F, G, H, J, K, L, M, e TOTAL (linha 61) são preservadas.
 */

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format, parse } from 'date-fns'
import type { OvertimeRecord, Profile } from '@/types'

const TEMPLATE_PATH = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL
  ? (import.meta as { env: { BASE_URL: string } }).env.BASE_URL + 'templates/autorizacao_horas_extras.xlsx'
  : '/scanner-ponto/templates/autorizacao_horas_extras.xlsx'
const PRIMEIRA_LINHA_DADOS = 16
const ULTIMA_LINHA_DADOS = 60

// ─── Carregar template binário ────────────────────────────────────────────────

async function carregarTemplate(): Promise<ArrayBuffer> {
  const res = await fetch(TEMPLATE_PATH)
  if (!res.ok) throw new Error(`Falha ao carregar template XLSX: ${res.status}`)
  return res.arrayBuffer()
}

// ─── Converter "HH:mm" para Date (fração do dia para ExcelJS) ─────────────────

function horaParaDate(hora: string): Date {
  const [h, m] = hora.split(':').map(Number)
  // ExcelJS aceita Date; para hora usamos uma data base zerada
  const d = new Date(1899, 11, 30, h, m, 0, 0) // base Excel (30/12/1899)
  return d
}

function dataParaDate(dataISO: string): Date {
  // "YYYY-MM-DD" → Date local sem conversão UTC
  const [y, m, d] = dataISO.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── Preencher cabeçalho ──────────────────────────────────────────────────────

function preencherCabecalho(ws: ExcelJS.Worksheet, profile: Profile): void {
  ws.getCell('B8').value = profile.nome.toUpperCase()
  ws.getCell('I8').value = Number(profile.matricula) || profile.matricula
  ws.getCell('B9').value = profile.funcao.toUpperCase()
  ws.getCell('B11').value = profile.responsavel.toUpperCase()
  ws.getCell('I11').value = profile.lotacao.toUpperCase()
}

// ─── Preencher linhas de dados ────────────────────────────────────────────────

function preencherLinhas(ws: ExcelJS.Worksheet, registros: OvertimeRecord[]): void {
  // Limpar linhas de dados antes de preencher
  for (let row = PRIMEIRA_LINHA_DADOS; row <= ULTIMA_LINHA_DADOS; row++) {
    const r = ws.getRow(row)
    r.getCell('A').value = null
    r.getCell('B').value = null
    r.getCell('C').value = null
    r.getCell('D').value = null
    r.getCell('I').value = null
    // NÃO tocamos em E, F, G, H, J, K, L, M — preservar fórmulas
  }

  registros.forEach((reg, idx) => {
    const rowNum = PRIMEIRA_LINHA_DADOS + idx
    if (rowNum > ULTIMA_LINHA_DADOS) return

    const row = ws.getRow(rowNum)

    // A — Data (como Date para o Excel formatar)
    const dataCell = row.getCell('A')
    dataCell.value = dataParaDate(reg.data)
    dataCell.numFmt = 'DD/MM/YYYY'

    // B — Intrajornada (sim/não)
    row.getCell('B').value = reg.intrajornada ? 'sim' : 'não'

    // C — Horário início (como time)
    const inicioCell = row.getCell('C')
    inicioCell.value = horaParaDate(reg.horario_inicio)
    inicioCell.numFmt = 'HH:MM'

    // D — Horário término (como time)
    const terminoCell = row.getCell('D')
    terminoCell.value = horaParaDate(reg.horario_termino)
    terminoCell.numFmt = 'HH:MM'

    // I — Justificativa
    row.getCell('I').value = reg.justificativa

    row.commit()
  })
}

// ─── Exportação principal ─────────────────────────────────────────────────────

export async function gerarAutorizacaoHorasExtras(
  registros: OvertimeRecord[],
  profile: Profile,
  periodoLabel: string
): Promise<void> {
  const templateBuffer = await carregarTemplate()

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(templateBuffer)

  const ws = wb.getWorksheet(1) ?? wb.worksheets[0]
  if (!ws) throw new Error('Planilha não encontrada no template')

  preencherCabecalho(ws, profile)
  preencherLinhas(ws, registros)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const nomeArquivo = `Autorizacao_HE_${profile.nome.replace(/\s+/g, '_')}_${periodoLabel.replace(/\//g, '-')}.xlsx`
  saveAs(blob, nomeArquivo)
}
