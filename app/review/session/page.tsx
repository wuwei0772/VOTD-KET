'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getDueItems, promote, demote, type ReviewItem, MAX_BOX } from '@/lib/review'
import { getRandomWords } from '@/lib/vocabulary'
import { getWordInfo } from '@/lib/word-data'
import { getQuizData } from '@/lib/quiz'
import { speakEnglish } from '@/lib/tts'
import BottomTabBar from '@/components/BottomTabBar'
import WordLearnCard from '@/components/WordLearnCard'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Question types follow the Leitner box:
//   box 1 -> meaning   (English word, pick the Chinese meaning)
//   box 2 -> listening (hear the word, pick the English word)
//   box 3 -> cloze     (example sentence with the word blanked out)
type QuestionKind = 'meaning' | 'listening' | 'cloze'

interface Question {
  kind: QuestionKind
  word: string
  box: number
  prompt: string | null // cloze sentence (with blank); null for other kinds
  options: { label: string; correct: boolean }[]
}

const KIND_LABEL: Record<QuestionKind, string> = {
  meaning: '选出正确的中文意思',
  listening: '听发音，选出你听到的词',
  cloze: '选出能填入句子的词',
}

function blankSentence(sentence: string, word: string): string | null {
  const idx = sentence.toLowerCase().indexOf(word.toLowerCase())
  if (idx === -1) return null
  return `${sentence.slice(0, idx)}______${sentence.slice(idx + word.length)}`
}

async function buildQuestion(item: ReviewItem): Promise<Question> {
  const word = item.word

  if (item.box === 1) {
    // Meaning: distractor meanings come from other words' static cards.
    const info = await getWordInfo(word)
    const candidates = getRandomWords(8, [word])
    const metas = await Promise.all(candidates.map((w) => getWordInfo(w)))
    const distractorMeanings: string[] = []
    for (const m of metas) {
      if (m?.meaning && m.meaning !== info?.meaning && !distractorMeanings.includes(m.meaning)) {
        distractorMeanings.push(m.meaning)
      }
      if (distractorMeanings.length === 3) break
    }
    return {
      kind: 'meaning',
      word,
      box: item.box,
      prompt: null,
      options: shuffle([
        { label: info?.meaning ?? word, correct: true },
        ...distractorMeanings.map((m) => ({ label: m, correct: false })),
      ]),
    }
  }

  if (item.box === 2) {
    return {
      kind: 'listening',
      word,
      box: item.box,
      prompt: null,
      options: shuffle([
        { label: word, correct: true },
        ...getRandomWords(3, [word]).map((w) => ({ label: w, correct: false })),
      ]),
    }
  }

  // Box 3: cloze. Prefer the learn-card example, fall back to the quiz
  // sentence; if neither contains the word, fall back to a meaning question.
  const info = await getWordInfo(word)
  let sentence: string | null = null
  for (const ex of info?.examples ?? []) {
    sentence = blankSentence(ex.en, word)
    if (sentence) break
  }
  if (!sentence) {
    const quiz = await getQuizData(word)
    if (quiz?.sentence) sentence = blankSentence(quiz.sentence, word)
  }
  if (!sentence) {
    return buildQuestion({ ...item, box: 1 })
  }
  return {
    kind: 'cloze',
    word,
    box: item.box,
    prompt: sentence,
    options: shuffle([
      { label: word, correct: true },
      ...getRandomWords(3, [word]).map((w) => ({ label: w, correct: false })),
    ]),
  }
}

type Phase = 'loading' | 'question' | 'relearn' | 'summary' | 'empty'

export default function ReviewSessionPage() {
  const [queue, setQueue] = useState<ReviewItem[]>([])
  const [index, setIndex] = useState(0)
  // Question and answer state are keyed by queue position so they derive to
  // fresh values when the current item changes (no reset-in-effect needed).
  const [questionResult, setQuestionResult] = useState<{ key: number; q: Question } | null>(null)
  const [answer, setAnswer] = useState<{ key: number; chosen: number; graduated: boolean } | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [speaking, setSpeaking] = useState(false)
  const [stats, setStats] = useState({ promoted: 0, graduatedCount: 0, demoted: 0 })
  const spokenFor = useRef<string | null>(null)

  useEffect(() => {
    getDueItems().then((items) => {
      if (items.length === 0) { setPhase('empty'); return }
      setQueue(items)
      setPhase('question')
    })
  }, [])

  const item = queue[index]
  const question = questionResult?.key === index ? questionResult.q : null
  const chosen = answer?.key === index ? answer.chosen : null
  const graduated = answer?.key === index ? answer.graduated : false

  useEffect(() => {
    if (!item) return
    let active = true
    buildQuestion(item).then((q) => {
      if (active) setQuestionResult({ key: index, q })
    })
    return () => { active = false }
  }, [item, index])

  // Listening questions: play the word automatically once loaded.
  useEffect(() => {
    if (phase === 'question' && question?.kind === 'listening' && spokenFor.current !== question.word) {
      spokenFor.current = question.word
      setSpeaking(true)
      speakEnglish(question.word, { onEnd: () => setSpeaking(false) })
    }
  }, [question, phase])

  const speak = useCallback(() => {
    if (!question) return
    setSpeaking(true)
    speakEnglish(question.word, { onEnd: () => setSpeaking(false) })
  }, [question])

  const choose = async (i: number) => {
    if (chosen !== null || !question || !item) return
    setAnswer({ key: index, chosen: i, graduated: false })
    if (question.options[i].correct) {
      const updated = await promote(item.word)
      const didGraduate = updated?.status === 'mastered'
      setAnswer({ key: index, chosen: i, graduated: didGraduate })
      setStats((s) => ({
        ...s,
        promoted: s.promoted + (didGraduate ? 0 : 1),
        graduatedCount: s.graduatedCount + (didGraduate ? 1 : 0),
      }))
    } else {
      await demote(item.word)
      setStats((s) => ({ ...s, demoted: s.demoted + 1 }))
    }
  }

  const wasCorrect = chosen !== null && question?.options[chosen].correct === true

  const next = () => {
    if (chosen !== null && !wasCorrect && phase === 'question') {
      setPhase('relearn')
      return
    }
    if (index < queue.length - 1) {
      setIndex((i) => i + 1)
      setPhase('question')
    } else {
      setPhase('summary')
    }
  }

  const header = (
    <header
      className="sticky top-0 z-10"
      style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-md mx-auto px-4 h-11 flex items-center justify-between">
        <Link href="/review" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
          复习本
        </Link>
        {queue.length > 0 && phase !== 'summary' && (
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{Math.min(index + 1, queue.length)}</span>
            <span className="mx-1" style={{ color: 'var(--border)' }}>/</span>
            {queue.length}
          </span>
        )}
      </div>
      <div style={{ height: '2px', background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${queue.length > 0 ? (index / queue.length) * 100 : 0}%`, background: 'var(--accent)', transition: 'width 0.3s ease-out' }} />
      </div>
    </header>
  )

  const shell = (children: React.ReactNode, footer?: React.ReactNode) => (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {header}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-3">{children}</main>
      <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}>
        {footer && <div className="max-w-md mx-auto px-4 py-3">{footer}</div>}
        <BottomTabBar />
      </div>
    </div>
  )

  if (phase === 'loading') {
    return shell(
      <div className="flex-1 flex items-center justify-center">
        <p className="animate-pulse text-sm" style={{ color: 'var(--muted)' }}>加载中…</p>
      </div>,
    )
  }

  if (phase === 'empty') {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
        <p style={{ fontSize: '40px' }}>🎉</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>今天没有待复习的词</p>
        <Link href="/review" className="text-sm font-medium underline underline-offset-2" style={{ color: 'var(--accent)' }}>
          返回复习本
        </Link>
      </div>,
    )
  }

  if (phase === 'summary') {
    const reviewed = stats.promoted + stats.graduatedCount + stats.demoted
    return shell(
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className="px-6 py-8 text-center">
        <p style={{ fontSize: '40px' }}>{stats.graduatedCount > 0 ? '🎓' : '✅'}</p>
        <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text)' }}>今日复习完成</p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>共复习 {reviewed} 个词</p>
        <div className="mt-5 flex flex-col gap-2 text-sm text-left">
          {stats.graduatedCount > 0 && (
            <div className="flex justify-between px-4 py-2.5" style={{ background: '#F0FDF4', borderRadius: '8px' }}>
              <span style={{ color: '#27500A' }}>🎓 毕业（已掌握）</span>
              <span className="font-semibold" style={{ color: '#27500A' }}>{stats.graduatedCount}</span>
            </div>
          )}
          {stats.promoted > 0 && (
            <div className="flex justify-between px-4 py-2.5" style={{ background: 'var(--label-bg)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text)' }}>⬆️ 升级</span>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{stats.promoted}</span>
            </div>
          )}
          {stats.demoted > 0 && (
            <div className="flex justify-between px-4 py-2.5" style={{ background: '#FEF2F2', borderRadius: '8px' }}>
              <span style={{ color: '#501313' }}>🔁 重新学习（明天再考）</span>
              <span className="font-semibold" style={{ color: '#501313' }}>{stats.demoted}</span>
            </div>
          )}
        </div>
      </div>,
      <Link href="/review">
        <button style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
          返回复习本 →
        </button>
      </Link>,
    )
  }

  if (phase === 'relearn' && item) {
    return shell(
      <>
        <p className="text-sm px-1" style={{ color: 'var(--muted)' }}>没关系，再认识一遍它：</p>
        <WordLearnCard key={item.word} word={item.word} autoSpeak />
        <div style={{ height: '8px' }} />
      </>,
      <button
        onClick={next}
        style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
      >
        记下了，明天再考我 →
      </button>,
    )
  }

  // phase === 'question'
  const locked = chosen !== null
  return shell(
    <>
      {!question ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="animate-pulse" style={{ height: '120px', borderRadius: '12px', background: 'var(--label-bg)' }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse" style={{ height: '52px', borderRadius: '10px', background: 'var(--label-bg)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Stimulus card */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className="px-5 py-6">
            {question.kind === 'meaning' && (
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex-1 break-words leading-tight" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
                  {question.word}
                </h2>
                <SpeakButton speaking={speaking} onClick={speak} />
              </div>
            )}
            {question.kind === 'listening' && (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={speak}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: speaking ? 'var(--accent)' : 'var(--accent-soft)',
                    color: speaking ? '#fff' : 'var(--accent)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  title="再听一遍"
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>点击可重听</p>
              </div>
            )}
            {question.kind === 'cloze' && (
              <p style={{ fontSize: '19px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.6 }}>
                {question.prompt}
              </p>
            )}
          </div>

          <p className="text-sm" style={{ color: 'var(--muted)', paddingLeft: '2px' }}>
            {KIND_LABEL[question.kind]}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((opt, i) => {
              const isChosen = chosen === i
              let bg = 'var(--card)'
              let borderColor = 'var(--border)'
              let textColor = 'var(--text)'
              if (locked) {
                if (opt.correct) { bg = '#F0FDF4'; borderColor = '#639922'; textColor = '#27500A' }
                else if (isChosen) { bg = '#FEF2F2'; borderColor = '#A32D2D'; textColor = '#501313' }
              }
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={locked}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: bg, color: textColor, textAlign: 'left', cursor: locked ? 'default' : 'pointer', transition: 'all 0.15s', fontSize: '15px', fontWeight: 500 }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {locked && wasCorrect && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px' }} className="px-4 py-3 text-sm" >
              <span style={{ color: '#27500A', fontWeight: 500 }}>
                {graduated
                  ? `🎓 太棒了！「${question.word}」毕业，进入已掌握！`
                  : `✓ 正确！升到第 ${Math.min(question.box + 1, MAX_BOX)} 盒，${question.box + 1 === 2 ? '3 天' : '7 天'}后再见`}
              </span>
            </div>
          )}
        </>
      )}
      <div style={{ height: '8px' }} />
    </>,
    <button
      onClick={next}
      disabled={!locked}
      className="disabled:opacity-30"
      style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: locked ? 'pointer' : 'not-allowed', transition: 'opacity 0.15s' }}
    >
      {locked && !wasCorrect ? '重新认识这个词 →' : index < queue.length - 1 ? '下一题 →' : '查看总结 →'}
    </button>,
  )
}

function SpeakButton({ speaking, onClick }: { speaking: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
        background: speaking ? 'var(--accent)' : 'var(--label-bg)',
        color: speaking ? '#fff' : 'var(--muted)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      title="朗读"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </button>
  )
}
