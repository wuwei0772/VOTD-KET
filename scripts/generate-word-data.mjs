import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const OFOX_API_KEY = process.env.OFOX_API_KEY
const OFOX_BASE_URL = process.env.OFOX_BASE_URL
if (!OFOX_API_KEY || !OFOX_BASE_URL) {
  console.error('Missing OFOX_API_KEY or OFOX_BASE_URL')
  process.exit(1)
}

const OUTPUT_DIR = path.join(__dirname, '../public/word-data')
const DELAY_MS = 1000

function stableHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

async function fetchWordInfo(word, attempt = 1) {
  const res = await fetch(`${OFOX_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': OFOX_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: '你是英语词汇教学助手，帮助中文母语者学习英语。只返回JSON，不要有任何额外文字或markdown代码块。',
      messages: [{
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
      }],
    }),
  })

  if (!res.ok) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 3000 * attempt))
      return fetchWordInfo(word, attempt + 1)
    }
    throw new Error(`API ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  return JSON.parse(match ? match[0] : text)
}

async function generateAndSave(word) {
  const filename = `${stableHash(word)}.json`
  const filePath = path.join(OUTPUT_DIR, filename)

  try { await fs.access(filePath); process.stdout.write(`  skip: ${word}\n`); return true } catch {}

  try {
    const info = await fetchWordInfo(word)
    await fs.writeFile(filePath, JSON.stringify(info), 'utf8')
    process.stdout.write(`  ok: ${word}\n`)
    return true
  } catch (e) {
    process.stdout.write(`  FAIL: ${word} (${e.message})\n`)
    return false
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const raw = await fs.readFile(path.join(__dirname, '../data/vocabulary.json'), 'utf8')
  const vocab = JSON.parse(raw)

  const args = process.argv.slice(2)
  const filterUnit = args[args.indexOf('--unit') + 1] ?? null
  const filterLesson = args[args.indexOf('--lesson') + 1] ?? null

  const words = new Set()
  for (const unit of vocab)
    for (const [unitKey, unitVal] of Object.entries(unit)) {
      if (filterUnit && unitKey !== filterUnit) continue
      for (const [lessonKey, lesson] of Object.entries(unitVal)) {
        if (filterLesson && lessonKey !== filterLesson) continue
        for (const w of lesson) words.add(w)
      }
    }

  const list = [...words]
  const existing = (await fs.readdir(OUTPUT_DIR)).filter(f => f.endsWith('.json')).length
  console.log(`${list.length} unique words, ${existing} already generated, ${list.length - existing} remaining\n`)

  let failed = 0
  for (let i = 0; i < list.length; i++) {
    const ok = await generateAndSave(list[i])
    if (!ok) failed++
    const pct = Math.round(((i + 1) / list.length) * 100)
    if ((i + 1) % 5 === 0 || i === list.length - 1)
      console.log(`[${pct}%] ${i + 1}/${list.length} processed, ${failed} failed`)
    if (i < list.length - 1) await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\nDone. ${(await fs.readdir(OUTPUT_DIR)).filter(f => f.endsWith('.json')).length} JSON files in public/word-data/`)
}

main().catch(console.error)
