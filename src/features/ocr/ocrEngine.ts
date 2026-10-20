import { supabase } from '@/services/supabase/client'
import { normalizarData, normalizarHora } from '@/features/ocr/dateTimeParser'
import { mensagemErroAmigavel } from '@/utils/errorMessages'
import type { OcrResult } from '@/types'

export { normalizarData, normalizarHora } from '@/features/ocr/dateTimeParser'

// ─── Debug logger (silencioso em produção) ────────────────────────────────────

const DEBUG = import.meta.env.DEV
function dbg(...args: unknown[]) {
  if (DEBUG) console.log('[ocrEngine]', ...args)
}

// ─── Pré-processamento ────────────────────────────────────────────────────────

export async function preprocessImage(imageSource: string | File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = imageSource instanceof Blob ? URL.createObjectURL(imageSource) : imageSource

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      let { width, height } = img
      // Fotos de celular saem com 3000-4000px+ de lado — um canvas nesse
      // tamanho consome dezenas de MB de RAM por leitura. Texto de
      // comprovante térmico não precisa dessa resolução pro OCR funcionar,
      // e repetir isso a cada foto (câmera nativa + canvas grande) é o que
      // faz o Android/Chrome descartar a aba do PWA por pressão de memória
      // a cada poucas leituras seguidas. Nunca ampliamos (só reduzimos).
      const MAX_DIMENSAO = 1800
      if (Math.max(width, height) > MAX_DIMENSAO) {
        const escala = MAX_DIMENSAO / Math.max(width, height)
        width = Math.floor(width * escala)
        height = Math.floor(height * escala)
      }

      canvas.width = width
      canvas.height = height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      const hist = new Array(256).fill(0)
      const total = width * height
      for (let i = 0; i < data.length; i += 4) {
        const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        hist[g]++
      }
      let soma = 0
      for (let i = 0; i < 256; i++) soma += i * hist[i]
      let somaB = 0, pesoB = 0, maxVar = 0, thresh = 128
      for (let t = 0; t < 256; t++) {
        pesoB += hist[t]
        if (!pesoB) continue
        const pesoF = total - pesoB
        if (!pesoF) break
        somaB += t * hist[t]
        const mB = somaB / pesoB
        const mF = (soma - somaB) / pesoF
        const v = pesoB * pesoF * (mB - mF) ** 2
        if (v > maxVar) { maxVar = v; thresh = t }
      }

      for (let i = 0; i < data.length; i += 4) {
        const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        const bin = g < thresh ? 0 : 255
        data[i] = bin; data[i + 1] = bin; data[i + 2] = bin
      }
      ctx.putImageData(imageData, 0, 0)

      const dataUrl = canvas.toDataURL('image/png')
      // Libera o buffer do canvas imediatamente em vez de esperar o GC —
      // ajuda em dispositivos com pouca RAM que fazem várias leituras seguidas.
      canvas.width = 0
      canvas.height = 0
      if (imageSource instanceof Blob) URL.revokeObjectURL(url)
      resolve(dataUrl)
    }

    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = url
  })
}

// ─── Chamada à Edge Function ──────────────────────────────────────────────────

async function chamarVisionAPI(base64: string): Promise<string> {
  const conteudo = base64.includes(',') ? base64.split(',')[1] : base64

  const { data, error } = await supabase.functions.invoke('ocr-vision', {
    body: { image: conteudo },
  })

  if (error) throw new Error(await mensagemErroAmigavel(error))
  if (data?.error) throw new Error(data.error as string)

  return (data?.text as string) ?? ''
}

// ─── Processamento OCR principal ──────────────────────────────────────────────

// Erros lançados aqui indicam falha na REQUISIÇÃO (rede, Edge Function,
// rate limit) — o item não pôde nem ser processado. É diferente de um OCR
// que rodou mas não achou data/hora na imagem (isso vira sucesso: false
// no retorno normal, não uma exceção).
export async function processarOCR(imageSource: string | File | Blob): Promise<OcrResult> {
  dbg('Iniciando pré-processamento')
  const preprocessed = await preprocessImage(imageSource)
  dbg('Pré-processamento concluído, enviando para Vision API')

  const textoBruto = await chamarVisionAPI(preprocessed)
  dbg('Texto bruto retornado pela Vision API:', textoBruto)

  const dataExtraida = normalizarData(textoBruto)
  const horaExtraida = normalizarHora(textoBruto)

  dbg('Data identificada:', dataExtraida)
  dbg('Hora identificada:', horaExtraida)

  const confianca = dataExtraida && horaExtraida ? 95 : dataExtraida || horaExtraida ? 50 : 0
  dbg('Confiança:', confianca, '| Sucesso:', !!(dataExtraida && horaExtraida))

  return {
    data: dataExtraida,
    hora: horaExtraida,
    confianca,
    texto_bruto: textoBruto,
    sucesso: !!(dataExtraida && horaExtraida),
  }
}

// ─── terminateOCR — mantido por compatibilidade (no-op) ───────────────────────

export async function terminateOCR(): Promise<void> {
  // no-op
}