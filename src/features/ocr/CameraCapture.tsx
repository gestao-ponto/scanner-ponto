import { useEffect, useRef, useState } from 'react'
import { X, Circle, RotateCcw } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

type Estado = 'abrindo' | 'pronta' | 'erro'

const CHAVE_CAMERA_PREFERIDA = 'meu-ponto:camera-preferida'

// Captura a foto dentro da própria página via getUserMedia, em vez de abrir
// o app de Câmera nativo (<input capture>). No Android, um PWA instalado em
// modo standalone perde prioridade de memória assim que vai pra segundo
// plano — e abrir a Câmera nativa faz exatamente isso, levando o sistema a
// matar o processo do app e recarregar a página do zero ao voltar (perdendo
// a leitura em andamento). Mantendo a câmera dentro da própria página, o app
// nunca sai de primeiro plano.
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [estado, setEstado] = useState<Estado>('abrindo')
  const [erro, setErro] = useState('')

  // Celulares com câmera principal + ultra-angular (+ às vezes telephoto)
  // expõem cada lente como um deviceId separado em enumerateDevices(). Não
  // há uma forma confiável de saber pela API qual delas é a "principal" —
  // facingMode:"environment" às vezes resolve pra lente errada (ultra-
  // angular). Em vez de adivinhar, listamos as câmeras disponíveis e
  // deixamos o usuário escolher/alternar, lembrando a escolha pra próxima vez.
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([])
  const [indiceAtual, setIndiceAtual] = useState(0)

  useEffect(() => {
    let cancelado = false

    function pararStream() {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    async function abrirStream(constraints: MediaStreamConstraints) {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (cancelado) {
        stream.getTracks().forEach((t) => t.stop())
        return null
      }
      pararStream()
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      return stream
    }

    async function iniciar() {
      setEstado('abrindo')

      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não suporta captura de câmera na página. Use "Selecionar da galeria".')
        setEstado('erro')
        return
      }

      try {
        // Se já sabemos a câmera preferida do usuário, abre direto nela.
        const preferida = localStorage.getItem(CHAVE_CAMERA_PREFERIDA)
        const constraintsIniciais: MediaStreamConstraints = {
          video: preferida
            ? { deviceId: { exact: preferida }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        }

        let stream: MediaStream | null
        try {
          stream = await abrirStream(constraintsIniciais)
        } catch {
          // deviceId salvo pode não existir mais (trocou de celular, etc.) — cai pro padrão
          stream = await abrirStream({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          })
        }
        if (!stream) return

        // Agora que temos permissão, os labels/deviceIds ficam disponíveis
        const todos = await navigator.mediaDevices.enumerateDevices()
        if (cancelado) return
        const cameras = todos.filter((d) => d.kind === 'videoinput')
        setDispositivos(cameras)

        const idAtual = stream.getVideoTracks()[0]?.getSettings().deviceId
        const idx = cameras.findIndex((c) => c.deviceId === idAtual)
        setIndiceAtual(idx >= 0 ? idx : 0)

        setEstado('pronta')
      } catch (err) {
        if (cancelado) return
        const nome = (err as DOMException)?.name
        if (nome === 'NotAllowedError') {
          setErro('Permissão da câmera negada. Habilite o acesso à câmera nas configurações do navegador.')
        } else if (nome === 'NotFoundError') {
          setErro('Nenhuma câmera encontrada neste dispositivo.')
        } else {
          setErro('Não foi possível abrir a câmera. Tente "Selecionar da galeria".')
        }
        setEstado('erro')
      }
    }

    iniciar()

    return () => {
      cancelado = true
      pararStream()
    }
  }, [])

  const trocarCamera = async () => {
    if (dispositivos.length < 2) return
    const proximoIndice = (indiceAtual + 1) % dispositivos.length
    const proximo = dispositivos[proximoIndice]

    setEstado('abrindo')
    // A maioria dos celulares Android só permite UM stream de câmera ativo
    // por vez — pedir o próximo dispositivo antes de soltar o atual faz o
    // hardware recusar o pedido. Por isso paramos o stream atual primeiro.
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: proximo.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIndiceAtual(proximoIndice)
      localStorage.setItem(CHAVE_CAMERA_PREFERIDA, proximo.deviceId)
      setEstado('pronta')
    } catch (err) {
      console.error('[CameraCapture] Falha ao trocar de câmera:', err)

      // Não deixa o usuário sem nenhuma câmera ativa — tenta voltar pra que
      // já estava funcionando antes da troca falhar.
      const anterior = dispositivos[indiceAtual]
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: anterior.deviceId } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setEstado('pronta')
      } catch {
        setErro('Não foi possível trocar de câmera.')
        setEstado('erro')
      }
    }
  }

  const capturar = () => {
    const video = videoRef.current
    if (!video || estado !== 'pronta') return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `comprovante-${Date.now()}.jpg`, { type: 'image/jpeg' })
        canvas.width = 0
        canvas.height = 0
        onCapture(file)
      },
      'image/jpeg',
      0.92
    )
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white">
          <X size={18} />
        </button>
        <span className="text-white text-sm font-medium">Escanear comprovante</span>
        <button
          onClick={trocarCamera}
          disabled={dispositivos.length < 2 || estado === 'abrindo'}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30"
          aria-label="Trocar câmera"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

        {estado === 'abrindo' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {estado === 'erro' && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-white text-sm text-center">{erro}</p>
          </div>
        )}

        {estado === 'pronta' && dispositivos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/40 px-2.5 py-1 rounded-full">
            Câmera {indiceAtual + 1} de {dispositivos.length} — toque no ícone ↻ se não for a certa
          </div>
        )}
      </div>

      <div className="flex items-center justify-center py-6 shrink-0">
        <button
          onClick={capturar}
          disabled={estado !== 'pronta'}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40"
          aria-label="Capturar foto"
        >
          <Circle size={48} className="text-white" fill="white" />
        </button>
      </div>
    </div>
  )
}
