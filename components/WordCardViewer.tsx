'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { saveWord, removeWord, isWordSaved, type WordInfo } from '@/lib/notebook'
import BottomTabBar from '@/components/BottomTabBar'

function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

interface Props {
  words: string[]
  unitNum: number
  lessonNum: number
  unitId: string
  lessonId: string
}

export default function WordCardViewer({ words, lessonNum, unitId, lessonId }: Props) {
  const [index, setIndex] = useState(0)
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speakingEx, setSpeakingEx] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const cache = useRef(new Map<string, WordInfo>())

  const word = words[index]
  const progress = ((index + 1) / words.length) * 100

  const fetchWord = useCallback(async (w: string): Promise<WordInfo | null> => {
    if (cache.current.has(w)) return cache.current.get(w)!
    try {
      // Try pre-generated static file first (instant load)
      const staticRes = await fetch(`/word-data/${stableHash(w)}.json`)
      if (staticRes.ok) {
        const data: WordInfo = await staticRes.json()
        cache.current.set(w, data)
        return data
      }
    } catch {}
    try {
      // Fall back to API
      const res = await fetch('/api/word-info', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word: w }),
      })
      if (!res.ok) throw new Error()
      const data: WordInfo = await res.json()
      cache.current.set(w, data)
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    setImgLoaded(false)
    setImgError(false)
    const cached = cache.current.get(word)
    if (cached) {
      setWordInfo(cached)
      setLoading(false)
    } else {
      setWordInfo(null)
      setLoading(true)
      fetchWord(word).then((data) => {
        if (!isCurrent) return
        setWordInfo(data)
        setLoading(false)
      })
    }
    isWordSaved(word).then((s) => { if (isCurrent) setSaved(s) })
    return () => { isCurrent = false }
  }, [word, fetchWord])

  // Prefetch next word silently
  useEffect(() => {
    if (index < words.length - 1) fetchWord(words[index + 1])
  }, [index, words, fetchWord])

  const speakText = (text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.85
    if (onEnd) u.onend = onEnd
    window.speechSynthesis.speak(u)
  }

  const speak = () => {
    setSpeakingEx(null)
    speakText(word, () => setSpeaking(false))
    setSpeaking(true)
  }

  const speakExample = (text: string, i: number) => {
    setSpeaking(false)
    setSpeakingEx(i)
    speakText(text, () => setSpeakingEx(null))
  }

  const toggleSave = async () => {
    if (!wordInfo) return
    if (saved) {
      setSaved(false)
      await removeWord(word)
    } else {
      setSaved(true)
      await saveWord(word, wordInfo, unitId, lessonId)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Sticky header */}
      <header
        className="sticky top-0 z-10"
        style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-md mx-auto px-4 h-11 flex items-center justify-between">
          <Link
            href={`/unit/${unitId}`}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            Lesson {lessonNum}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{index + 1}</span>
              <span className="mx-1" style={{ color: 'var(--border)' }}>/</span>
              {words.length}
            </span>
            <Link
              href="/notebook"
              className="flex items-center justify-center transition-opacity hover:opacity-60"
              style={{
                width: '30px', height: '30px', borderRadius: '7px',
                background: 'var(--accent-soft)', color: 'var(--accent)',
              }}
              title="我的笔记本"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </Link>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: '2px', background: 'var(--border)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent)',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-3">

        {/* Word + TTS + Save */}
        <div
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
          className="px-5 py-5 flex items-center justify-between gap-3"
        >
          <h1
            className="flex-1 break-words leading-tight"
            style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text)' }}
          >
            {word}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={speak}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: speaking ? 'var(--accent)' : 'var(--label-bg)',
                color: speaking ? '#fff' : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
            <button
              onClick={toggleSave}
              disabled={!wordInfo}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: saved ? '#EEF2FF' : 'var(--label-bg)',
                color: saved ? 'var(--accent)' : 'var(--muted)',
                border: 'none',
                cursor: wordInfo ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={saved ? '从笔记本移除' : '保存到笔记本'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            height: '180px',
            position: 'relative',
          }}
        >
          {(!imgLoaded && !imgError) && (
            <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--label-bg)' }} />
          )}
          {!imgError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={word}
              src={`/word-images/${stableHash(word)}.jpg`}
              alt={word}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(false) }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.5s ease',
              }}
            />
          )}
          {imgError && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: 'var(--label-bg)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--border)' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>图片加载失败</p>
            </div>
          )}
        </div>

        {/* AI content */}
        {loading ? (
          <ContentSkeleton />
        ) : wordInfo ? (
          <>
            {/* Meaning + Usage */}
            <div
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
              className="px-5 py-4"
            >
              <Pill type="meaning">释义</Pill>
              <p className="mt-2 font-semibold" style={{ fontSize: '18px', color: 'var(--text)', lineHeight: 1.4 }}>
                {wordInfo.meaning}
              </p>

              {wordInfo.usageNote && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <Pill type="usage">用法</Pill>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {wordInfo.usageNote}
                  </p>
                </div>
              )}
            </div>

            {/* Examples */}
            <div
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
              className="px-5 py-4"
            >
              <Pill type="example">例句</Pill>
              <div className="mt-3 space-y-3">
                {wordInfo.examples.map((ex, i) => (
                  <div
                    key={i}
                    className={i > 0 ? 'pt-3' : ''}
                    style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
                  >
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
                        {ex.en}
                      </p>
                      <button
                        onClick={() => speakExample(ex.en, i)}
                        style={{
                          flexShrink: 0,
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: speakingEx === i ? 'var(--accent)' : 'var(--label-bg)',
                          color: speakingEx === i ? '#fff' : 'var(--muted)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          marginTop: '1px',
                        }}
                        title="朗读例句"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--muted)' }}>
                      {ex.zh}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
            className="p-8 text-center"
          >
            <p className="text-sm" style={{ color: 'var(--muted)' }}>内容加载失败</p>
            <button
              onClick={() => {
                setLoading(true)
                fetchWord(word).then((d) => { setWordInfo(d); setLoading(false) })
              }}
              className="mt-3 text-sm font-medium underline underline-offset-2"
              style={{ color: 'var(--accent)' }}
            >
              重试
            </button>
          </div>
        )}

        <div style={{ height: '8px' }} />
      </main>

      {/* Bottom navigation */}
      <div
        className="sticky bottom-0"
        style={{
          background: 'rgba(248,246,241,0.92)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            className="disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            上一个
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(words.length - 1, i + 1))}
            disabled={index === words.length - 1}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            className="disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85"
          >
            下一个
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <BottomTabBar />
      </div>

    </div>
  )
}

function Pill({ children, type }: { children: React.ReactNode; type?: 'meaning' | 'usage' | 'example' }) {
  const styles: Record<string, { background: string; color: string }> = {
    meaning: { background: '#EEF2FF', color: '#4F7FFF' },
    usage:   { background: '#F0FDF4', color: '#3D9970' },
    example: { background: '#FFF4EC', color: '#E07B39' },
  }
  const s = type ? styles[type] : { background: 'var(--label-bg)', color: 'var(--muted)' }
  return (
    <span
      style={{
        display: 'inline-block',
        background: s.background,
        color: s.color,
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 10px',
        borderRadius: '999px',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </span>
  )
}

function ContentSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
          className="px-5 py-4"
        >
          <div className="animate-pulse rounded-full h-5 w-10" style={{ background: 'var(--label-bg)' }} />
          <div className="animate-pulse rounded mt-2 h-5 w-3/5" style={{ background: 'var(--label-bg)' }} />
          {i === 2 && (
            <div className="mt-3 space-y-2">
              <div className="animate-pulse rounded h-4 w-full" style={{ background: 'var(--label-bg)' }} />
              <div className="animate-pulse rounded h-4 w-4/5" style={{ background: 'var(--label-bg)' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
