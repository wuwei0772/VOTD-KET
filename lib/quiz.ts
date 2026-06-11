'use client'

export interface QuizData {
  sentence: string
  synonym: string
  synonymNote: string
  distractors: { word: string; note: string }[]
}

function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

export async function getQuizData(word: string): Promise<QuizData | null> {
  try {
    const res = await fetch(`/quiz-data/${stableHash(word)}.json`)
    if (res.ok) return res.json()
  } catch {}
  return null
}
