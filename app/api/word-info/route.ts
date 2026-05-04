import { NextRequest } from 'next/server'

const cache = new Map<string, object>()

const hasChinese = (s: string) => /[一-鿿]/.test(s)

export async function POST(req: NextRequest) {
  const { word } = await req.json()
  if (!word) return Response.json({ error: 'Missing word' }, { status: 400 })

  const cached = cache.get(word) as Record<string, unknown> | undefined
  if (cached && !hasChinese(String(cached.imagePrompt ?? ''))) {
    return Response.json(cached)
  }

  const res = await fetch(`${process.env.OFOX_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.OFOX_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: '你是英语词汇教学助手，帮助中文母语者学习英语。只返回JSON，不要有任何额外文字或markdown代码块。',
      messages: [
        {
          role: 'user',
          content: `为英语词汇/短语 "${word}" 生成学习卡片，严格返回如下JSON格式（不要加代码块）：
{
  "meaning": "简洁中文释义（15字以内）",
  "usageNote": "用超口语化方式解释：词性、使用场合、语气，或易混淆词区别。像跟好朋友聊天，不要像教科书。30字以内，有趣一点！",
  "examples": [
    {"en": "包含该词的自然英文例句", "zh": "对应中文翻译"},
    {"en": "另一个英文例句", "zh": "对应中文翻译"}
  ],
  "imagePrompt": "3-6 simple English words only for image generation, no Chinese characters, e.g. 'person laughing with friend'"
}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('ofox API error:', res.status, text)
    return Response.json({ error: 'Upstream error' }, { status: 502 })
  }

  const data = await res.json()
  const text: string = data.content?.[0]?.text ?? ''

  try {
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : text)
    cache.set(word, parsed)
    return Response.json(parsed)
  } catch {
    console.error('Parse error. Raw:', text)
    return Response.json({ error: 'Parse error' }, { status: 500 })
  }
}
