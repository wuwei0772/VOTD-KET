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

const OUTPUT_DIR = path.join(__dirname, '../public/quiz-data')
const DELAY_MS = 1200

function stableHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

async function fetchQuizData(word, attempt = 1) {
  const res = await fetch(`${OFOX_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': OFOX_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You are a KET vocabulary expert. Return only valid JSON, no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `For the KET vocabulary word "${word}", generate synonym substitution quiz data.

Rules:
- sentence: one short, natural English example sentence (A1–A2 level, at most 14 words) that contains "${word}" EXACTLY as written (same spelling, same form), so the student sees the word used in context
- The sentence must still sound natural. Do not force awkward word order just to keep a phrase contiguous; choose a different natural sentence pattern instead.
- synonym: one common English word or short phrase that can replace "${word}" in that exact sentence without changing the meaning; must be simpler or equally simple (A1–A2 level)
- synonymNote: 用简体中文写一句简短解释（不超过20个字），说明为什么它可以替换
- distractors: exactly 3 plausible but WRONG English words a student might confuse with "${word}" in this sentence; each note 用简体中文写（不超过20个字），说明为什么它不能替换
- All words in options must be A1–B1 level; never harder than "${word}"
- Never use double quotation marks (") inside any JSON string value; if the sentence is spoken dialogue, write it without quotation marks

Return exactly this JSON (no code block):
{
  "sentence": "example sentence containing the word",
  "synonym": "simpler word",
  "synonymNote": "中文解释为什么正确",
  "distractors": [
    { "word": "wrong word 1", "note": "中文解释为什么不行" },
    { "word": "wrong word 2", "note": "中文解释为什么不行" },
    { "word": "wrong word 3", "note": "中文解释为什么不行" }
  ]
}`,
      }],
    }),
  })

  if (!res.ok) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 3000 * attempt))
      return fetchQuizData(word, attempt + 1)
    }
    throw new Error(`API ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  try {
    return JSON.parse(match ? match[0] : text)
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000))
      return fetchQuizData(word, attempt + 1)
    }
    throw e
  }
}

async function generateAndSave(word) {
  const filename = `${stableHash(word)}.json`
  const filePath = path.join(OUTPUT_DIR, filename)

  try { await fs.access(filePath); process.stdout.write(`  skip: ${word}\n`); return true } catch {}

  try {
    const info = await fetchQuizData(word)
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
  const unitIdx = args.indexOf('--unit')
  const lessonIdx = args.indexOf('--lesson')
  const filterUnit = unitIdx >= 0 && unitIdx + 1 < args.length ? args[unitIdx + 1] : null
  const filterLesson = lessonIdx >= 0 && lessonIdx + 1 < args.length ? args[lessonIdx + 1] : null

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

  const concIdx = args.indexOf('--concurrency')
  const concurrency = concIdx >= 0 && concIdx + 1 < args.length ? parseInt(args[concIdx + 1], 10) : 1

  let failed = 0
  let done = 0
  let next = 0
  async function worker() {
    while (next < list.length) {
      const i = next++
      const ok = await generateAndSave(list[i])
      if (!ok) failed++
      done++
      if (done % 10 === 0 || done === list.length)
        console.log(`[${Math.round((done / list.length) * 100)}%] ${done}/${list.length} processed, ${failed} failed`)
      if (next < list.length) await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))

  console.log(`\nDone. ${(await fs.readdir(OUTPUT_DIR)).filter(f => f.endsWith('.json')).length} files in public/quiz-data/`)
}

main().catch(console.error)
