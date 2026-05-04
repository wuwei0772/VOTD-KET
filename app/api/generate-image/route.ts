import { NextRequest } from 'next/server'

const cache = new Map<string, string>()

function styleWrap(word: string): string {
  return `Flat vector illustration of "${word}". Colorful, clean bold outlines, friendly cartoon style, minimalist shapes, no photorealism, no realistic human faces, no text or letters.`
}

export async function POST(req: NextRequest) {
  const { prompt, seed } = await req.json()
  if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 })

  const cacheKey = `${prompt}:${seed ?? ''}`
  if (cache.has(cacheKey)) return Response.json({ url: cache.get(cacheKey) })

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ZHIPUAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'cogview-3-flash',
      prompt: styleWrap(prompt),
      size: '1440x720',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('ZhipuAI error:', res.status, text)
    return Response.json({ error: 'Image generation failed' }, { status: 502 })
  }

  const data = await res.json()
  const url: string | undefined = data.data?.[0]?.url
  if (!url) {
    console.error('ZhipuAI: no URL in response', data)
    return Response.json({ error: 'No image URL' }, { status: 500 })
  }

  cache.set(cacheKey, url)
  return Response.json({ url })
}
