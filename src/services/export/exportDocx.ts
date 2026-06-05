/**
 * Exportador DOCX — Cartão de Ponto
 *
 * Estratégia: recria o documento fiel ao template usando a lib `docx`.
 * Preserva layout, colunas e estrutura original mapeada do arquivo modelo.
 *
 * Estrutura do cartão:
 *   - Cabeçalho: Nome, Matrícula, Função, Lotação, C.Custo, Responsável, Período
 *   - Tabela de marcações: Dia | E1 | S1 | E2 | S2 | E3 | S3 | Obs
 *   - Dias 20→31 do mês anterior + 01→19 do mês atual
 *   - Sábado/Domingo = "---"
 */

import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeightRule,
  VerticalAlign,
} from 'docx'
import { saveAs } from 'file-saver'
import { isWeekend, eachDayOfInterval, format, getDay } from 'date-fns'
import type { WorkRecord, Profile, Periodo } from '@/types'
import { agruparPorDia } from '@/features/work-records/calculations'

type MarcacoesDia = {
  entrada_manha: string
  saida_manha: string
  entrada_tarde: string
  saida_tarde: string
  entrada_noite: string
  saida_noite: string
  obs: string
  fimSemana: boolean
}

function getMarcacoesDia(records: WorkRecord[]): MarcacoesDia {
  const sorted = [...records].sort((a, b) => a.hora.localeCompare(b.hora))
  const fimSemana = records.length === 0 ? false : isWeekend(new Date(records[0].data + 'T12:00:00'))

  return {
    entrada_manha: sorted[0]?.hora ?? '',
    saida_manha: sorted[1]?.hora ?? '',
    entrada_tarde: sorted[2]?.hora ?? '',
    saida_tarde: sorted[3]?.hora ?? '',
    entrada_noite: sorted[4]?.hora ?? '',
    saida_noite: sorted[5]?.hora ?? '',
    obs: '',
    fimSemana,
  }
}

// ─── Helpers de célula ────────────────────────────────────────────────────────

function cell(
  text: string,
  opts: {
    bold?: boolean
    size?: number
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    colspan?: number
    shading?: string
    width?: number
  } = {}
): TableCell {
  return new TableCell({
    columnSpan: opts.colspan ?? 1,
    shading: opts.shading ? { fill: opts.shading, type: 'clear', color: 'auto' } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            size: opts.size ?? 16, // 8pt = 16 half-points
            font: 'Arial',
          }),
        ],
        spacing: { before: 20, after: 20 },
      }),
    ],
  })
}

function emptyRow(cols: number): TableRow {
  return new TableRow({
    children: Array.from({ length: cols }, () => cell('')),
    height: { value: 200, rule: HeightRule.EXACT },
  })
}

// ─── Construção do documento ──────────────────────────────────────────────────

export async function gerarCartaoPonto(
  records: WorkRecord[],
  profile: Profile,
  periodo: Periodo
): Promise<void> {
  const agrupado = agruparPorDia(records)
  const dias = eachDayOfInterval({ start: periodo.inicio, end: periodo.fim })

  // Linha de dias com marcações
  const linhasDias: TableRow[] = dias.map((dia) => {
    const isoData = format(dia, 'yyyy-MM-dd')
    const diaDia = format(dia, 'dd')
    const fimSemana = isWeekend(dia)
    const domHelper = getDay(dia) // 0=dom, 6=sab

    const isDomingo = domHelper === 0
    const isSabado = domHelper === 6
    const ehFds = isSabado || isDomingo

    const recordsDia = agrupado.get(isoData) ?? []
    const marc = ehFds
      ? {
          entrada_manha: '---',
          saida_manha: '---',
          entrada_tarde: '---',
          saida_tarde: '---',
          entrada_noite: '',
          saida_noite: '',
          obs: '',
          fimSemana: true,
        }
      : getMarcacoesDia(recordsDia)

    return new TableRow({
      height: { value: 300, rule: HeightRule.ATLEAST },
      children: [
        cell(diaDia, { bold: true, shading: ehFds ? 'D9D9D9' : undefined }),
        cell(marc.entrada_manha),
        cell(marc.saida_manha),
        cell(marc.entrada_tarde),
        cell(marc.saida_tarde),
        cell(marc.entrada_noite),
        cell(marc.saida_noite),
        cell(marc.obs, { align: AlignmentType.LEFT }),
      ],
    })
  })

  // ─── Construção das linhas de cabeçalho ───────────────────────────────────

  const mesLabel = format(periodo.fim, 'MMMM').toUpperCase()
  const anoLabel = format(periodo.fim, 'yyyy')

  const tabelaPrincipal = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      // Título
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 8,
            shading: { fill: 'D9D9D9', type: 'clear', color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'CARTÃO DE PONTO DO COLABORADOR',
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Nome e Lotação
      new TableRow({
        children: [
          cell('', { bold: true }),
          cell('Nome:', { bold: true, align: AlignmentType.LEFT }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: profile.nome, size: 16, font: 'Arial' })],
              }),
            ],
          }),
          cell(''),
          cell('Lotação', { bold: true }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: profile.lotacao, size: 16, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      // Matrícula e C. Custo
      new TableRow({
        children: [
          cell(''),
          cell('Matrícula:', { bold: true, align: AlignmentType.LEFT }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: profile.matricula, size: 16, font: 'Arial' })],
              }),
            ],
          }),
          cell(''),
          cell('C. Custo:', { bold: true }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: profile.centro_custo, size: 16, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      // Função e Responsável
      new TableRow({
        children: [
          cell(''),
          cell('Função:', { bold: true, align: AlignmentType.LEFT }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: profile.funcao, size: 16, font: 'Arial' })],
              }),
            ],
          }),
          cell(''),
          cell('Responsável:', { bold: true }),
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: profile.responsavel, size: 16, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      // Linha vazia
      emptyRow(8),
      // Período
      new TableRow({
        children: [
          cell('Período:', { bold: true }),
          cell(mesLabel, { colspan: 2 }),
          cell(''),
          cell(anoLabel, { colspan: 2 }),
          cell(''),
          cell(''),
        ],
      }),
      // Jornada
      new TableRow({
        children: [
          cell('Entrada:', { bold: true }),
          cell('08:00'),
          cell('Intervalo para Refeição:', { bold: true, colspan: 2 }),
          cell('12:00'),
          cell('às'),
          cell('14:00'),
          cell('Saída:', { bold: true }),
          cell('18:00'),
        ],
      }),
      // Repouso
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 8,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Repouso Semanal: Sábado / Domingo', bold: true, size: 16, font: 'Arial' }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Cabeçalho de colunas (grupo)
      new TableRow({
        tableHeader: true,
        children: [
          cell('Dias', { bold: true, shading: 'D9D9D9' }),
          new TableCell({
            columnSpan: 2,
            shading: { fill: 'D9D9D9', type: 'clear', color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Manhã', bold: true, size: 16, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 2,
            shading: { fill: 'D9D9D9', type: 'clear', color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Tarde', bold: true, size: 16, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 2,
            shading: { fill: 'D9D9D9', type: 'clear', color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Noite', bold: true, size: 16, font: 'Arial' })],
              }),
            ],
          }),
          cell('Assinatura', { bold: true, shading: 'D9D9D9' }),
        ],
      }),
      // Subcabeçalho Entrada/Saída
      new TableRow({
        tableHeader: true,
        children: [
          cell('', { shading: 'D9D9D9' }),
          cell('Entrada', { bold: true, shading: 'D9D9D9' }),
          cell('Saída', { bold: true, shading: 'D9D9D9' }),
          cell('Entrada', { bold: true, shading: 'D9D9D9' }),
          cell('Saída', { bold: true, shading: 'D9D9D9' }),
          cell('Entrada', { bold: true, shading: 'D9D9D9' }),
          cell('Saída', { bold: true, shading: 'D9D9D9' }),
          cell('', { shading: 'D9D9D9' }),
        ],
      }),
      // Linhas de dias
      ...linhasDias,
      // Assinatura colaborador
      emptyRow(8),
      new TableRow({
        children: [
          cell(''),
          new TableCell({
            columnSpan: 6,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Assinatura do Colaborador: ', italics: true, bold: true, size: 16, font: 'Arial' }),
                  new TextRun({ text: '_______________________________', size: 16, font: 'Arial' }),
                ],
              }),
            ],
          }),
          cell(''),
        ],
      }),
      emptyRow(8),
      new TableRow({
        children: [
          cell(''),
          new TableCell({
            columnSpan: 6,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Assinatura do Gerente: ', italics: true, bold: true, size: 16, font: 'Arial' }),
                  new TextRun({ text: '_______________________________', size: 16, font: 'Arial' }),
                ],
              }),
            ],
          }),
          cell(''),
        ],
      }),
      emptyRow(8),
      new TableRow({
        children: [
          cell(''),
          cell('', { colspan: 2 }),
          cell('Data:', { bold: true }),
          cell('', { colspan: 4 }),
        ],
      }),
    ],
  })

  // ─── Rodapé ───────────────────────────────────────────────────────────────
  const tabelaRodape = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      new TableRow({
        children: [
          cell('Cartão de Ponto do Colaborador'),
          cell('FP.CP.11.01'),
          cell('Revisão 2'),
          cell('15/05/2019'),
          cell('Página 1 de 1'),
        ],
      }),
    ],
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [tabelaPrincipal, new Paragraph({ text: '' }), tabelaRodape],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const nomeArquivo = `Cartao_Ponto_${profile.nome.replace(/\s+/g, '_')}_${format(periodo.fim, 'MMMyyyy').toUpperCase()}.docx`
  saveAs(blob, nomeArquivo)
}
