const API_KEY = process.argv[2]
if (!API_KEY) { console.error('Usage: node scripts/test-api.mjs <api_key>'); process.exit(1) }

function stableHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

async function test(word) {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'cogview-3-flash', prompt: word, size: '1440x720' }),
  })
  const data = await res.json()
  const url = data.data?.[0]?.url
  if (url) console.log('OK', word, '->', url.slice(0, 70))
  else console.log('FAIL', word, res.status, JSON.stringify(data).slice(0, 150))
}

await Promise.all(['have a good time', 'puzzle', 'hobby'].map(test))
