import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API_KEY = process.env.ZHIPUAI_API_KEY
if (!API_KEY) {
  console.error('Missing ZHIPUAI_API_KEY env var')
  process.exit(1)
}

const OUTPUT_DIR = path.join(__dirname, '../public/word-images')
const CONCURRENCY = 1
const BATCH_DELAY_MS = 2500

// Must match the component's stableHash
function stableHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function styleWrap(word) {
  return `Flat vector illustration of "${word}". Colorful, clean bold outlines, friendly cartoon style, minimalist shapes, no photorealism, no realistic human faces, no text or letters.`
}

async function generateAndSave(word, attempt = 1) {
  const filename = `${stableHash(word)}.jpg`
  const filePath = path.join(OUTPUT_DIR, filename)

  try { await fs.access(filePath); process.stdout.write(`  skip: ${word}\n`); return true } catch {}

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'cogview-3-flash',
      prompt: styleWrap(word),
      size: '1440x720',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 4000 * attempt))
      return generateAndSave(word, attempt + 1)
    }
    process.stdout.write(`  FAIL: ${word} (${res.status}: ${text.slice(0, 80)})\n`)
    return false
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) {
    process.stdout.write(`  FAIL: ${word} (no URL in response)\n`)
    return false
  }

  const imgRes = await fetch(url)
  if (!imgRes.ok) { process.stdout.write(`  FAIL: ${word} (download ${imgRes.status})\n`); return false }
  await fs.writeFile(filePath, Buffer.from(await imgRes.arrayBuffer()))
  process.stdout.write(`  ok: ${word}\n`)
  return true
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const raw = await fs.readFile(path.join(__dirname, '../data/vocabulary.json'), 'utf8')
  const vocab = JSON.parse(raw)

  // Optional --unit unit1 --lesson lesson1 filters
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
  const existing = (await fs.readdir(OUTPUT_DIR)).filter(f => f.endsWith('.jpg')).length
  console.log(`${list.length} unique words, ${existing} already generated, ${list.length - existing} remaining`)
  console.log(`Concurrency: ${CONCURRENCY}\n`)

  let failed = 0
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(w => generateAndSave(w)))
    failed += results.filter(r => !r).length
    const pct = Math.round(((i + batch.length) / list.length) * 100)
    console.log(`[${pct}%] ${i + batch.length}/${list.length} processed, ${failed} failed`)
    if (i + CONCURRENCY < list.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
  }

  const total = (await fs.readdir(OUTPUT_DIR)).filter(f => f.endsWith('.jpg')).length
  console.log(`\nDone. ${total} images in public/word-images/`)
}

main().catch(console.error)
