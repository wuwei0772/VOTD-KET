'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { getQuizData, type QuizData } from '@/lib/quiz'
import { recordWrong, recordFirstCorrect } from '@/lib/review'
import { speakEnglish } from '@/lib/tts'
import BottomTabBar from '@/components/BottomTabBar'
import WordLearnCard, { type WrongChoice } from '@/components/WordLearnCard'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Option {
  word: string
  note: string
  correct: boolean
}

function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  const idx = sentence.toLowerCase().indexOf(word.toLowerCase())
  if (idx === -1) return <>{sentence}</>
  return (
    <>
      {sentence.slice(0, idx)}
      <strong style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
        {sentence.slice(idx, idx + word.length)}
      </strong>
      {sentence.slice(idx + word.length)}
    </>
  )
}

interface Props {
  words: string[]
  unitId: string
  lessonId: string
  backHref: string
  backLabel: string
}

type Phase = 'quiz' | 'result' | 'learn'

export default function QuizViewer({ words, unitId, lessonId, backHref, backLabel }: Props) {
  const [index, setIndex] = useState(0)
  const [quizData, setQuizData] = useState<{ word: string; data: QuizData | null } | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  // Keyed by word so it derives back to null when the question changes.
  const [chosenResult, setChosenResult] = useState<{ word: string; index: number } | null>(null)
  const [wrongWords, setWrongWords] = useState<string[]>([])
  const [wrongChoices, setWrongChoices] = useState<Record<string, WrongChoice>>({})
  const [learnIndex, setLearnIndex] = useState(0)
  const [learned, setLearned] = useState(false)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [speaking, setSpeaking] = useState(false)
  const cache = useRef(new Map<string, QuizData | null>())

  const word = words[index]
  const chosen = chosenResult?.word === word ? chosenResult.index : null
  const locked = chosen !== null
  const progress = ((index) / words.length) * 100

  const fetchData = useCallback(async (w: string) => {
    if (cache.current.has(w)) return cache.current.get(w)!
    const data = await getQuizData(w)
    cache.current.set(w, data)
    return data
  }, [])

  useEffect(() => {
    let active = true
    fetchData(word).then((data) => {
      if (!active) return
      setQuizData({ word, data })
      if (data) {
        const opts = shuffle<Option>([
          { word: data.synonym, note: data.synonymNote, correct: true },
          ...data.distractors.map(d => ({ word: d.word, note: d.note, correct: false })),
        ])
        setOptions(opts)
      }
    })
    return () => { active = false }
  }, [word, fetchData])

  useEffect(() => {
    if (index < words.length - 1) fetchData(words[index + 1])
  }, [index, words, fetchData])

  const speak = () => {
    if (!speakEnglish(quizData?.data?.sentence ?? word, { onEnd: () => setSpeaking(false) })) return
    setSpeaking(true)
  }

  const choose = async (i: number) => {
    if (locked) return
    setChosenResult({ word, index: i })
    const correct = options[i].correct
    if (!correct) {
      const right = options.find(o => o.correct)
      setWrongWords(prev => prev.includes(word) ? prev : [...prev, word])
      setWrongChoices(prev => ({
        ...prev,
        [word]: {
          chosen: options[i].word,
          chosenNote: options[i].note,
          correct: right?.word ?? '',
          correctNote: right?.note,
        },
      }))
      await recordWrong(word, unitId, lessonId)
    } else {
      await recordFirstCorrect(word, unitId, lessonId)
    }
  }

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1)
    } else {
      setPhase('result')
    }
  }

  if (phase === 'learn') {
    const learnWord = wrongWords[learnIndex]
    const isLast = learnIndex >= wrongWords.length - 1
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <header
          className="sticky top-0 z-10"
          style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="max-w-md mx-auto px-4 h-11 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>认识一下这些词</span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{learnIndex + 1}</span>
              <span className="mx-1" style={{ color: 'var(--border)' }}>/</span>
              {wrongWords.length}
            </span>
          </div>
          <div style={{ height: '2px', background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${((learnIndex + 1) / wrongWords.length) * 100}%`, background: 'var(--accent)', transition: 'width 0.3s ease-out' }} />
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-4 py-4">
          <WordLearnCard key={learnWord} word={learnWord} wrongChoice={wrongChoices[learnWord]} autoSpeak />
          <div style={{ height: '8px' }} />
        </main>

        <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}>
          <div className="max-w-md mx-auto px-4 py-3">
            <button
              onClick={() => {
                if (isLast) { setLearned(true); setPhase('result') }
                else setLearnIndex(i => i + 1)
              }}
              style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              {isLast ? '记下了，明天考我 ✓' : '记下了，下一个 →'}
            </button>
          </div>
          <BottomTabBar />
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const correct = words.length - wrongWords.length
    const pct = Math.round((correct / words.length) * 100)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <header
          className="sticky top-0 z-10"
          style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="max-w-md mx-auto px-4 h-11 flex items-center">
            <Link href={backHref} className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
              {backLabel}
            </Link>
          </div>
          <div style={{ height: '2px', background: 'var(--border)' }}>
            <div style={{ height: '100%', width: '100%', background: 'var(--accent)' }} />
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col gap-4">
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className="px-6 py-8 text-center">
            <p className="text-4xl font-semibold" style={{ color: 'var(--text)' }}>{correct}/{words.length}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{pct}% 正确率 · 同义替换测试</p>

            {wrongWords.length > 0 ? (
              <div className="mt-6 text-left">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                  {learned ? '这些词已进入复习本，明天记得来复习：' : '这些词已进入复习本：'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {wrongWords.map(w => (
                    <span
                      key={w}
                      style={{ background: 'var(--label-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', fontSize: '13px', color: 'var(--text)' }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>全部正确，同义词敏感度很强！</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {wrongWords.length > 0 && !learned && (
              <button
                onClick={() => { setLearnIndex(0); setPhase('learn') }}
                style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                花一分钟认识这 {wrongWords.length} 个词 →
              </button>
            )}
            {wrongWords.length > 0 && learned && (
              <Link href="/review">
                <button
                  style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                >
                  查看复习本 →
                </button>
              </Link>
            )}
            <button
              onClick={() => { setIndex(0); setWrongWords([]); setWrongChoices({}); setLearned(false); setPhase('quiz'); setChosenResult(null) }}
              style={{ height: '44px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              重新测试
            </button>
            <Link href={backHref}>
              <button style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)', fontSize: '14px', cursor: 'pointer' }}>
                返回
              </button>
            </Link>
          </div>
        </main>
        <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}>
          <BottomTabBar />
        </div>
      </div>
    )
  }

  const loading = quizData?.word !== word

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-10"
        style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-md mx-auto px-4 h-11 flex items-center justify-between">
          <Link href={backHref} className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
            {backLabel}
          </Link>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{index + 1}</span>
            <span className="mx-1" style={{ color: 'var(--border)' }}>/</span>
            {words.length}
          </span>
        </div>
        <div style={{ height: '2px', background: 'var(--border)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.3s ease-out' }} />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-3">

        {/* Sentence card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className="px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            {loading ? (
              <div className="animate-pulse w-full" style={{ height: '56px', borderRadius: '8px', background: 'var(--label-bg)' }} />
            ) : (
              <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.6 }}>
                {quizData?.data?.sentence
                  ? <HighlightedSentence sentence={quizData.data.sentence} word={word} />
                  : word}
              </p>
            )}
            <button
              onClick={speak}
              style={{ width: '40px', height: '40px', borderRadius: '8px', background: speaking ? 'var(--accent)' : 'var(--label-bg)', color: speaking ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              title="朗读"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </button>
          </div>
        </div>

        {/* Question */}
        <p className="text-sm" style={{ color: 'var(--muted)', paddingLeft: '2px' }}>
          哪个词可以替换句中的 <strong style={{ color: 'var(--text)' }}>{word}</strong>，且句子意思不变？
        </p>

        {/* Options */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse" style={{ height: '52px', borderRadius: '10px', background: 'var(--label-bg)' }} />
            ))}
          </div>
        ) : quizData?.data === null ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} className="p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>题目数据暂未生成，请先运行 generate-quiz-data 脚本</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((opt, i) => {
              const isChosen = chosen === i
              const showResult = locked
              let bg = 'var(--card)'
              let borderColor = 'var(--border)'
              let textColor = 'var(--text)'

              if (showResult) {
                if (opt.correct) { bg = '#F0FDF4'; borderColor = '#639922'; textColor = '#27500A' }
                else if (isChosen) { bg = '#FEF2F2'; borderColor = '#A32D2D'; textColor = '#501313' }
              } else if (isChosen) {
                borderColor = 'var(--accent)'
              }

              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={locked}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: bg, color: textColor, textAlign: 'left', cursor: locked ? 'default' : 'pointer', transition: 'all 0.15s' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{opt.word}</span>
                    {showResult && opt.correct && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    {showResult && isChosen && !opt.correct && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                  </div>
                  {showResult && (
                    <p style={{ fontSize: '12px', marginTop: '3px', opacity: 0.75 }}>{opt.note}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div style={{ height: '8px' }} />
      </main>

      {/* Bottom nav */}
      <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-md mx-auto px-4 py-3">
          <button
            onClick={next}
            disabled={!locked}
            style={{ width: '100%', height: '44px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: locked ? 'pointer' : 'not-allowed', transition: 'opacity 0.15s' }}
            className="disabled:opacity-30"
          >
            {index < words.length - 1 ? '下一题' : '查看结果'}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }}><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <BottomTabBar />
      </div>
    </div>
  )
}
