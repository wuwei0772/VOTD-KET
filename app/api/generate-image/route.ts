import { NextRequest } from 'next/server'

const cache = new Map<string, string>()

function styleWrap(word: string): string {
  return `Flat vector illustration of "${word}". Colorful, clean bold outlines, friendly cartoon style, minimalist shapes, no photorealism, no realistic human faces.`
}

const NEGATIVE_PROMPT = 'text, words, letters, numbers, alphabet, writing, typography, font, watermark, caption, label, signature, title, heading, inscription, graffiti, sign'

export async function POST(req: NextRequest) {
  const { prompt, seed } = await req.json()
  if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 })

  const cacheKey = `${prompt}:${seed ?? ''}`
  if (cache.has(cacheKey)) return Response.json({ url: cache.get(cacheKey) })

  const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Kwai-Kolors/Kolors',
      prompt: styleWrap(prompt),
      negative_prompt: NEGATIVE_PROMPT,
      image_size: '1024x512',
      num_inference_steps: 20,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('SiliconFlow error:', res.status, text)
    return Response.json({ error: 'Image generation failed' }, { status: 502 })
  }

  const data = await res.json()
  const url: string | undefined = data.images?.[0]?.url ?? data.data?.[0]?.url
  if (!url) {
    console.error('ZhipuAI: no URL in response', data)
    return Response.json({ error: 'No image URL' }, { status: 500 })
  }

  cache.set(cacheKey, url)
  return Response.json({ url })
}
