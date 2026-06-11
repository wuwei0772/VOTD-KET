'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllProgress, getStreak, todayStr, localDateStr, type ReviewItem, MAX_BOX } from '@/lib/review'
import { getTotalUniqueWordCount } from '@/lib/vocabulary'
import Image from 'next/image'
import BottomTabBar from '@/components/BottomTabBar'
import WordLearnCard from '@/components/WordLearnCard'
import { FlameIcon, ConfettiIcon } from '@/components/HandDrawnIcons'

function dueLabel(nextDue: string | null): string {
  if (!nextDue) return ''
  const today = todayStr()
  if (nextDue <= today) return '今天'
  const due = new Date(`${nextDue}T00:00:00`)
  const now = new Date(`${today}T00:00:00`)
  const days = Math.round((due.getTime() - now.getTime()) / 86400000)
  return days === 1 ? '明天' : `${days} 天后`
}

function BoxDots({ box }: { box: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`第 ${box} 盒`}>
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <span
          key={i}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i < box ? 'var(--accent)' : 'var(--border)',
          }}
        />
      ))}
    </span>
  )
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showMastered, setShowMastered] = useState(false)
  const [streak, setStreak] = useState(0)

  const total = getTotalUniqueWordCount()

  useEffect(() => {
    getAllProgress().then((data) => {
      setItems(data)
      setLoading(false)
    })
    getStreak().then(setStreak)
  }, [])

  const today = todayStr()
  const learning = items
    .filter((i) => i.status === 'learning')
    .sort((a, b) => ((a.next_due ?? '') < (b.next_due ?? '') ? -1 : 1))
  const mastered = items
    .filter((i) => i.status === 'mastered')
    .sort((a, b) => ((a.mastered_at ?? '') > (b.mastered_at ?? '') ? -1 : 1))
  const due = learning.filter((i) => i.next_due !== null && i.next_due <= today)
  const upcoming = learning.filter((i) => i.next_due !== null && i.next_due > today)
  const masteredToday = mastered.filter((i) => i.mastered_at && localDateStr(i.mastered_at) === today).length
  const pct = total > 0 ? Math.round((mastered.length / total) * 1000) / 10 : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-10"
        style={{ background: 'rgba(248,246,241,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>复习本</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Vocabulary of the Day</span>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-3">

        {/* VOTD progress card */}
        <div
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px' }}
          className="px-5 py-5"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              <Image
                src="/hero-book.png"
                alt=""
                width={26}
                height={14}
                style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}
              />
              全书进度
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{pct}%</p>
          </div>
          <div className="mt-2" style={{ height: '8px', borderRadius: '999px', background: 'var(--label-bg)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%', borderRadius: '999px', background: 'var(--accent)',
                width: `${total > 0 ? Math.min(100, (mastered.length / total) * 100) : 0}%`,
                transition: 'width 0.6s ease-out',
              }}
            />
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text)' }}>
            已掌握 <span className="font-semibold">{mastered.length}</span>
            <span style={{ color: 'var(--muted)' }}> / {total} 词</span>
          </p>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {loading ? (
              <div className="animate-pulse rounded h-11" style={{ background: 'var(--label-bg)' }} />
            ) : due.length > 0 ? (
              <Link href="/review/session">
                <button
                  style={{ width: '100%', height: '46px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  今日待复习 {due.length} 个词 · 开始 →
                </button>
              </Link>
            ) : (
              <p className="text-sm text-center py-2.5" style={{ color: 'var(--muted)' }}>
                {upcoming.length > 0
                  ? <>今天没有复习任务 <ConfettiIcon /> 最近一批 {dueLabel(upcoming[0].next_due)}到期</>
                  : learning.length === 0 && mastered.length === 0
                    ? '去做测验，答错的词会自动来到这里'
                    : <>今天没有复习任务 <ConfettiIcon /></>}
              </p>
            )}
          </div>

          {(masteredToday > 0 || streak > 0) && (
            <div className="mt-3 flex items-center justify-center gap-4">
              {masteredToday > 0 && (
                <span className="text-xs font-medium" style={{ color: '#639922' }}>今天已掌握 +{masteredToday}</span>
              )}
              {streak > 0 && (
                <span className="text-xs font-medium" style={{ color: '#E07B39' }}><FlameIcon size={16} /> 连续 {streak} 天</span>
              )}
            </div>
          )}
        </div>

        {/* Learning list */}
        {!loading && learning.length > 0 && (
          <div>
            <p className="text-xs font-medium px-1 mb-2" style={{ color: 'var(--muted)' }}>
              在复习中 · {learning.length} 词
            </p>
            <div className="flex flex-col gap-2">
              {learning.map((item) => (
                <div
                  key={item.word}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                >
                  <button
                    onClick={() => setExpanded(expanded === item.word ? null : item.word)}
                    className="w-full px-4 py-3 flex items-center gap-3"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--text)', fontSize: '15px' }}>
                        {item.word}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {item.unit_id ? `Unit ${item.unit_id} · ` : ''}错过 {item.wrong_count} 次
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <BoxDots box={item.box} />
                      <span
                        className="text-xs"
                        style={{ color: item.next_due && item.next_due <= today ? 'var(--accent)' : 'var(--muted)', fontWeight: item.next_due && item.next_due <= today ? 600 : 400 }}
                      >
                        {dueLabel(item.next_due)}
                      </span>
                    </div>
                  </button>
                  {expanded === item.word && (
                    <div className="px-3 pb-3">
                      <WordLearnCard key={item.word} word={item.word} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mastered list */}
        {!loading && mastered.length > 0 && (
          <div>
            <button
              onClick={() => setShowMastered((s) => !s)}
              className="w-full px-1 mb-2 flex items-center justify-between"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                已掌握 · {mastered.length} 词 🏆
              </span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"
                style={{ transform: showMastered ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showMastered && (
              <div className="flex flex-wrap gap-2">
                {mastered.map((item) => (
                  <span
                    key={item.word}
                    style={{ background: 'var(--label-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', fontSize: '13px', color: 'var(--muted)' }}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl h-16" style={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        )}

        {!loading && learning.length === 0 && mastered.length === 0 && (
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
            className="p-10 text-center"
          >
            <p style={{ fontSize: '32px' }}>📖</p>
            <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text)' }}>复习本还是空的</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>测验中答错的词会自动加入这里</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium underline underline-offset-2"
              style={{ color: 'var(--accent)' }}
            >
              去做测验
            </Link>
          </div>
        )}

      </main>
      <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.96)', backdropFilter: 'blur(8px)' }}>
        <BottomTabBar />
      </div>
    </div>
  )
}
