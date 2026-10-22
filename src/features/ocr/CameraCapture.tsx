import { useEffect, useRef, useState } from 'react'
import { X, Circle, RotateCcw } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

type Estado = 'abrindo' | 'pronta' | 'erro'

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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  useEffect(() => {
    let cancelado = false

    async function iniciarCamera() {
      setEstado('abrindo')
      pararStream()

      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não suporta captura de câmera na página. Use "Selecionar da galeria".')
        setEstado('erro')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            // Resolução suficiente pra OCR de texto impresso — pedir mais
            // só aumentaria memória/tempo de captura à toa.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
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

    function pararStream() {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    iniciarCamera()

    return () => {
      cancelado = true
      pararStream()
    }
  }, [facingMode])

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
          onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white"
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
