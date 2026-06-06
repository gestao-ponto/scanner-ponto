import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VisionRequest {
  image: string
}

interface VisionResponse {
  text: string
  error?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header ausente.' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const body: VisionRequest = await req.json()
    if (!body.image) {
      return new Response(
        JSON.stringify({ error: 'Campo "image" ausente no body.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_VISION_API_KEY não configurada.' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

    const visionBody = {
      requests: [
        {
          image: { content: body.image },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['pt', 'en'] },
        },
      ],
    }

    const visionRes = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visionBody),
    })

    if (!visionRes.ok) {
      const errText = await visionRes.text()
      console.error('[ocr-vision] Google Vision error:', visionRes.status, errText)
      return new Response(
        JSON.stringify({ error: `Google Vision retornou ${visionRes.status}.` }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const visionData = await visionRes.json()
    const textAnnotations = visionData?.responses?.[0]?.textAnnotations
    const fullText: string = textAnnotations?.[0]?.description ?? ''

    const response: VisionResponse = { text: fullText }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[ocr-vision] Exceção:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno na Edge Function.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})