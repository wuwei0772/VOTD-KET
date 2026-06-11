'use client'

// Access to the pre-generated static word assets in /public:
// word-data/{hash}.json (WordInfo), word-images/{hash}.jpg.

export interface WordInfo {
  meaning: string
  usageNote: string
  examples: Array<{ en: string; zh: string }>
  imagePrompt: string
}

export function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

export function wordImageUrl(word: string): string {
  return `/word-images/${stableHash(word)}.jpg`
}

const cache = new Map<string, WordInfo | null>()

export async function getWordInfo(word: string): Promise<WordInfo | null> {
  if (cache.has(word)) return cache.get(word)!

  let info: WordInfo | null = null
  try {
    const staticRes = await fetch(`/word-data/${stableHash(word)}.json`)
    if (staticRes.ok) {
      info = await staticRes.json()
    } else {
      const apiRes = await fetch('/api/word-info', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word }),
      })
      if (apiRes.ok) info = await apiRes.json()
    }
  } catch {}

  cache.set(word, info)
  return info
}
