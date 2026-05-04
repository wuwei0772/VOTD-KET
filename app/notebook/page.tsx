'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSavedWords, removeWord, type NotebookItem } from '@/lib/notebook'
import BottomTabBar from '@/components/BottomTabBar'

export default function NotebookPage() {
  const [items, setItems] = useState<NotebookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState('')
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storySpeaking, setStorySpeaking] = useState(false)

  const speakStory = () => {
    if (!('speechSynthesis' in window)) return
    if (storySpeaking) {
      window.speechSynthesis.cancel()
      setStorySpeaking(false)
      return
    }
    const lines = story.replace(/\*\*/g, '').split('\n')
    const englishText = lines.filter((l) => l.trim() && !/[一-鿿]/.test(l)).join(' ')
    if (!englishText) return
    const u = new SpeechSynthesisUtterance(englishText)
    u.lang = 'en-US'
    u.rate = 0.85
    u.onend = () => setStorySpeaking(false)
    u.onerror = () => setStorySpeaking(false)
    window.speechSynthesis.speak(u)
    setStorySpeaking(true)
  }

  useEffect(() => {
    getSavedWords().then((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  const handleRemove = async (word: string) => {
    await removeWord(word)
    setItems((prev) => prev.filter((i) => i.word !== word))
  }

  const handleStory = async () => {
    if (items.length === 0) return
    setStoryLoading(true)
    setStoryOpen(true)
    setStory('')
    const res = await fetch('/api/notebook/story', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ words: items.map((i) => i.word) }),
    })
    const data = await res.json()
    setStory(data.story ?? '生成失败，请重试。')
    setStoryLoading(false)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            首页
          </Link>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>我的笔记本</span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>{items.length} 词</span>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-3">

        {/* Action buttons */}
        {items.length > 0 && (
          <div className="flex gap-2">
            <Link
              href="/notebook/study"
              style={{
                flex: 1,
                height: '44px',
                borderRadius: '10px',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              开始学习
            </Link>
            <button
              onClick={handleStory}
              style={{
                flex: 1,
                height: '44px',
                borderRadius: '10px',
                background: '#FFF4EC',
                color: '#E07B39',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              生成故事
            </button>
          </div>
        )}

        {/* Story panel */}
        {storyOpen && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid #E07B39',
              borderRadius: '12px',
            }}
            className="px-5 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#E07B39' }}>AI 故事</span>
              <div className="flex items-center gap-2">
                {!storyLoading && story && (
                  <button
                    onClick={speakStory}
                    title={storySpeaking ? '停止朗读' : '朗读英文'}
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      background: storySpeaking ? '#FFF4EC' : 'var(--label-bg)',
                      color: storySpeaking ? '#E07B39' : 'var(--muted)',
                      border: storySpeaking ? '1px solid #E07B39' : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {storySpeaking ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setStoryOpen(false); if (storySpeaking) { window.speechSynthesis.cancel(); setStorySpeaking(false) } }}
                  style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                >×</button>
              </div>
            </div>
            {storyLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse rounded h-4" style={{ background: 'var(--label-bg)', width: `${[100,80,90][i-1]}%` }} />
                ))}
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: story.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent)">$1</strong>') }}
              />
            )}
          </div>
        )}

        {/* Word list */}
        {loading ? (
          <div className="space-y-2 mt-2">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse rounded-xl h-16" style={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
            className="p-10 text-center mt-4"
          >
            <p style={{ fontSize: '32px' }}>📒</p>
            <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text)' }}>笔记本还是空的</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>学习单词时，点击书签图标即可保存</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium underline underline-offset-2"
              style={{ color: 'var(--accent)' }}
            >
              去学习
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                }}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--text)', fontSize: '15px' }}>
                    {item.word}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                    {item.word_info.meaning}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  {formatDate(item.saved_at)}
                </span>
                <button
                  onClick={() => handleRemove(item.word)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--label-bg)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                    flexShrink: 0,
                  }}
                  title="移除"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

      </main>
      <div
        className="sticky bottom-0"
        style={{ background: 'rgba(248,246,241,0.96)', backdropFilter: 'blur(8px)' }}
      >
        <BottomTabBar />
      </div>
    </div>
  )
}
