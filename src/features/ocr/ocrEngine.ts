import Tesseract from 'tesseract.js'
import type { OcrResult } from '@/types'

// ─── Pré-processamento ────────────────────────────────────────────────────────

export async function preprocessImage(imageSource: string | File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = imageSource instanceof Blob ? URL.createObjectURL(imageSource) : imageSource

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      let { width, height } = img
      const TARGET = 2000
      const ratio = TARGET / Math.max(width, height)
      if (ratio > 1) {
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      } else if (width > 3000 || height > 3000) {
        const r2 = 3000 / Math.max(width, height)
        width = Math.floor(width * r2)
        height = Math.floor(height * r2)
      }

      canvas.width = width
      canvas.height = height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Threshold de Otsu
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

      const result = canvas.toDataURL('image/png')
      if (imageSource instanceof Blob) URL.revokeObjectURL(url)
      resolve(result)
    }

    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = url
  })
}

// ─── Correção de erros comuns do OCR em texto térmico ─────────────────────────
// O OCR confunde: 0↔O, 1↔I↔l, 2↔Z, 6↔G, .↔: etc.

function corrigirOCR(texto: string): string {
  return texto
    // Normalizar separadores de hora: ponto vira dois-pontos entre dígitos
    .replace(/(\d{1,2})\.(\d{2})\b/g, '$1:$2')
    // Corrigir ano: OCR lê 2076 como 2026, 2O26→2026, Z026→2026
    .replace(/\b(2)[O0o](\d{2})\b/g, '20$2')   // 2O26 → 2026
    .replace(/\b[Z2]0([6-9]\d)\b/g, '20$1')     // Z076 → 2076 → normaliza abaixo
    // Ano com dígito trocado (2076→2026, 2O26→2026)
    .replace(/\b20([5-9]\d)\b/g, (m, d) => {
      const n = parseInt(d)
      // se o segundo dígito parece erro (>3 para ano >= 2040 sendo improvável)
      if (n > 39) return `20${String(n - 50).padStart(2,'0')}`
      return m
    })
    // Uppercase para normalizar
    .toUpperCase()
}

// ─── Normalização de data ─────────────────────────────────────────────────────

function normalizarData(textoOriginal: string): string | null {
  const texto = corrigirOCR(textoOriginal)

  // Estratégia 1: DATA: DD/MM/YYYY com qualquer separador/espaço entre componentes
  const m1 = texto.match(/DATA\s*:?\s*(\d{1,2})\s*[\/\-\s]\s*(\d{1,2})\s*[\/\-\s]\s*(\d{4})/)
  if (m1) {
    const d = m1[1].padStart(2, '0'), mo = m1[2].padStart(2, '0'), y = m1[3]
    if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12 && +y >= 2020 && +y <= 2099)
      return `${d}/${mo}/${y}`
  }

  // Estratégia 2: extrai só dígitos após DATA: (resolve "04/0 6/2026")
  const m2 = texto.match(/DATA\s*:?\s*([\d\s\/\-]{5,16})/)
  if (m2) {
    const digits = m2[1].replace(/\D/g, '')
    if (digits.length >= 8) {
      const d = digits.slice(0, 2), mo = digits.slice(2, 4), y = digits.slice(4, 8)
      if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12 && +y >= 2020 && +y <= 2099)
        return `${d}/${mo}/${y}`
    }
  }

  // Estratégia 3: DD/MM/YYYY em qualquer lugar do texto
  const m3 = texto.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/)
  if (m3) {
    const d = m3[1], mo = m3[2], y = m3[3]
    if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12) return `${d}/${mo}/${y}`
  }

  // Estratégia 4: 8 dígitos consecutivos após DATA (ex: "DATA:04062026")
  const m4 = texto.match(/DATA\s*:?\s*\D{0,4}(\d{8})/)
  if (m4) {
    const digits = m4[1]
    const d = digits.slice(0, 2), mo = digits.slice(2, 4), y = digits.slice(4, 8)
    if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12 && +y >= 2020 && +y <= 2099)
      return `${d}/${mo}/${y}`
  }

  return null
}

// ─── Normalização de hora ─────────────────────────────────────────────────────

function normalizarHora(textoOriginal: string): string | null {
  const texto = corrigirOCR(textoOriginal)

  // Com âncora HORA: (aceita . ou : como separador — já normalizado acima)
  const m1 = texto.match(/HORA\s*:?\s*(\d{1,2})\s*[:\.]\s*(\d{2})/)
  if (m1) {
    const h = +m1[1], min = +m1[2]
    if (h <= 23 && min <= 59) return `${String(h).padStart(2, '0')}:${m1[2]}`
  }

  // Qualquer HH:MM no texto
  for (const m of texto.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    const h = +m[1], min = +m[2]
    if (h <= 23 && min <= 59) return `${String(h).padStart(2, '0')}:${m[2]}`
  }

  return null
}

// ─── Worker singleton ─────────────────────────────────────────────────────────

let worker: Tesseract.Worker | null = null

async function getWorker(): Promise<Tesseract.Worker> {
  if (worker) return worker
  worker = await Tesseract.createWorker('eng', 1, {
    logger: () => {},
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js',
  })
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    preserve_interword_spaces: '1',
  })
  return worker
}

export async function terminateOCR(): Promise<void> {
  if (worker) { await worker.terminate(); worker = null }
}

// ─── Processar OCR ────────────────────────────────────────────────────────────

export async function processarOCR(imageSource: string | File | Blob): Promise<OcrResult> {
  try {
    const preprocessed = await preprocessImage(imageSource)
    const w = await getWorker()

    const { data: d1 } = await w.recognize(preprocessed)
    let dataExtraida = normalizarData(d1.text)
    let horaExtraida = normalizarHora(d1.text)
    let textoBruto = d1.text
    let confianca = Math.round(d1.confidence)

    // Segunda tentativa com PSM AUTO se não encontrou
    if (!dataExtraida || !horaExtraida) {
      await w.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO })
      const { data: d2 } = await w.recognize(preprocessed)
      await w.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK })
      dataExtraida = dataExtraida ?? normalizarData(d2.text)
      horaExtraida = horaExtraida ?? normalizarHora(d2.text)
      textoBruto = d1.text + '\n---PSM_AUTO---\n' + d2.text
      confianca = Math.max(confianca, Math.round(d2.confidence))
    }

    return {
      data: dataExtraida,
      hora: horaExtraida,
      confianca,
      texto_bruto: textoBruto,
      sucesso: !!(dataExtraida && horaExtraida),
    }
  } catch (err) {
    return { data: null, hora: null, confianca: 0, texto_bruto: String(err), sucesso: false }
  }
}

