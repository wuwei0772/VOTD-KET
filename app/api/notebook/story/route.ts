import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { words } = await req.json()
  if (!Array.isArray(words) || words.length === 0) {
    return Response.json({ error: 'Missing words' }, { status: 400 })
  }

  const wordList = words.join(', ')

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
      system: '你是一个有趣的英语老师，擅长写生动有趣的短故事帮助学生记忆词汇。',
      messages: [
        {
          role: 'user',
          content: `用以下英语词汇/短语写一个有趣的短故事（约150词），要自然地把所有词汇都用进去。故事要生动、有趣、容易记忆。

词汇列表：${wordList}

格式要求：
1. 先写英文故事（每段2-3句）
2. 每段后面紧跟中文翻译
3. 在中英文中，用 **加粗** 标注使用到的词汇

只返回故事内容，不要额外说明。`,
        },
      ],
    }),
  })

  if (!res.ok) {
    return Response.json({ error: 'Upstream error' }, { status: 502 })
  }

  const data = await res.json()
  const story: string = data.content?.[0]?.text ?? ''
  return Response.json({ story })
}
