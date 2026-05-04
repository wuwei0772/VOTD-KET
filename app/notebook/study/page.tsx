'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import FlashCard from '@/components/FlashCard'
import { getSavedWords, removeWord, type NotebookItem } from '@/lib/notebook'
import BottomTabBar from '@/components/BottomTabBar'

function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

export default function StudyPage() {
  const [items, setItems] = useState<NotebookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    getSavedWords().then((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  const item: NotebookItem | undefined = items[index]
  const total = items.length

  const goTo = (next: number) => {
    setFlipped(false)
    setImgLoaded(false)
    setImgError(false)
    setTimeout(() => setIndex(next), 50)
  }

  const handleRemembered = async () => {
    if (!item) return
    const word = item.word
    await removeWord(word)
    setItems((prev) => {
      const next = prev.filter((i) => i.word !== word)
      setIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)))
      return next
    })
    setFlipped(false)
    setImgLoaded(false)
    setImgError(false)
  }

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.85
    window.speechSynthesis.speak(u)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse text-sm" style={{ color: 'var(--muted)' }}>加载中…</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
        <p style={{ fontSize: '40px' }}>📒</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>笔记本是空的，先去保存一些单词吧</p>
        <Link href="/notebook" className="text-sm font-medium underline underline-offset-2" style={{ color: 'var(--accent)' }}>
          返回笔记本
        </Link>
      </div>
    )
  }

  const imageUrl = `/word-images/${stableHash(item.word)}.jpg`

  const example = item.word_info.examples?.[0]

  const front = (
    <>
      {/* Image */}
      <div style={{ height: '220px', position: 'relative', background: 'var(--label-bg)', flexShrink: 0 }}>
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--label-bg)' }} />
        )}
        {imageUrl && !imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.word}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(false) }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
          />
        )}
      </div>
      {/* Word */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
        <h2 style={{ fontSize: '34px', fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>
          {item.word}
        </h2>
        <button
          onClick={(e) => { e.stopPropagation(); speak(item.word) }}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'var(--label-bg)', color: 'var(--muted)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>点击翻转查看释义</p>
      </div>
    </>
  )

  const back = (
    <div className="flex-1 flex flex-col px-6 py-6 gap-4 overflow-hidden">
      <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
        {item.word}
      </h2>

      <div>
        <span
          style={{
            display: 'inline-block', background: '#EEF2FF', color: '#4F7FFF',
            fontSize: '11px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px',
          }}
        >释义</span>
        <p className="mt-2 font-semibold" style={{ fontSize: '18px', color: 'var(--text)', lineHeight: 1.4 }}>
          {item.word_info.meaning}
        </p>
      </div>

      {item.word_info.usageNote && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {item.word_info.usageNote}
        </p>
      )}

      {example && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <span
            style={{
              display: 'inline-block', background: '#FFF4EC', color: '#E07B39',
              fontSize: '11px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px',
            }}
          >例句</span>
          <div className="flex items-start gap-2 mt-2">
            <p className="flex-1 text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
              {example.en}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); speak(example.en) }}
              style={{
                flexShrink: 0, width: '28px', height: '28px', borderRadius: '6px',
                background: 'var(--label-bg)', color: 'var(--muted)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </button>
          </div>
          <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--muted)' }}>{example.zh}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-md mx-auto px-4 h-11 flex items-center justify-between">
          <Link
            href="/notebook"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            笔记本
          </Link>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{index + 1}</span>
            <span className="mx-1" style={{ color: 'var(--border)' }}>/</span>
            {total}
          </span>
        </div>
        <div style={{ height: '2px', background: 'var(--border)' }}>
          <div
            style={{
              height: '100%',
              width: `${((index + 1) / total) * 100}%`,
              background: 'var(--accent)',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5 flex flex-col">
        <FlashCard
          front={front}
          back={back}
          flipped={flipped}
          onClick={() => setFlipped((f) => !f)}
        />
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
            onClick={() => goTo(Math.max(0, index - 1))}
            disabled={index === 0}
            style={{
              flex: 1, height: '44px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)',
              fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            className="disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            上一张
          </button>
          <button
            onClick={handleRemembered}
            style={{
              flex: 1, height: '44px', borderRadius: '10px',
              background: '#ECFDF5', color: '#059669',
              fontSize: '14px', fontWeight: 500, border: '1px solid #A7F3D0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            className="hover:opacity-80"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            记住了
          </button>
          <button
            onClick={() => goTo(Math.min(total - 1, index + 1))}
            disabled={index === total - 1}
            style={{
              flex: 1, height: '44px', borderRadius: '10px',
              background: 'var(--accent)', color: '#fff',
              fontSize: '14px', fontWeight: 500, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            className="disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85"
          >
            下一张
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
