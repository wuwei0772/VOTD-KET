'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getUnits, getLessons, getWords, unitNumber, getTotalUniqueWordCount } from '@/lib/vocabulary'
import { getAllProgress, getStreak, todayStr, localDateStr, type ReviewItem } from '@/lib/review'
import BottomTabBar from '@/components/BottomTabBar'
import { FlameIcon, ConfettiIcon } from '@/components/HandDrawnIcons'

export default function HomePage() {
  const units = getUnits()
  const total = getTotalUniqueWordCount()
  const [items, setItems] = useState<ReviewItem[] | null>(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    getAllProgress().then(setItems)
    getStreak().then(setStreak)
  }, [])

  const today = todayStr()
  const loading = items === null
  const mastered = (items ?? []).filter((i) => i.status === 'mastered')
  const learning = (items ?? []).filter((i) => i.status === 'learning')
  const due = learning.filter((i) => i.next_due !== null && i.next_due <= today)
  const masteredToday = mastered.filter((i) => i.mastered_at && localDateStr(i.mastered_at) === today).length
  const masteredWords = new Set(mastered.map((i) => i.word))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 max-w-md mx-auto w-full pb-10">

        {/* Hero banner */}
        <div
          style={{
            position: 'relative',
            height: '185px',
            background: '#F0E1D5',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', left: '26px', top: '56px' }}>
            <Image src="/hero-title.png" alt="VOTD" width={135} height={70} preload />
            <p className="text-xs mt-1" style={{ color: 'var(--muted)', paddingLeft: '6px' }}>
              KET Vocabulary Builder
            </p>
          </div>
          <Image
            src="/hero-child.png"
            alt=""
            width={63}
            height={140}
            preload
            style={{ position: 'absolute', right: '22px', bottom: '38px', transform: 'scaleX(-1)' }}
          />
          <Image
            src="/hero-book.png"
            alt=""
            width={65}
            height={35}
            style={{ position: 'absolute', right: '94px', bottom: '38px' }}
          />
        </div>

        {/* Stats card overlapping the banner */}
        <div className="px-4">
          <div
            className="relative px-5 py-4"
            style={{
              marginTop: '-28px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
            }}
          >
            <div className="flex items-center">
              <div className="flex-1 text-center">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>已掌握</p>
                <p className="mt-0.5 font-semibold" style={{ color: 'var(--text)', fontSize: '17px' }}>
                  {loading ? '–' : mastered.length}
                  <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}> / {total} 词</span>
                </p>
              </div>
              <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
              <div className="flex-1 text-center">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>连续</p>
                <p className="mt-0.5 font-semibold" style={{ color: 'var(--text)', fontSize: '17px' }}>
                  {streak > 0 && <FlameIcon />}
                  {loading ? ' –' : ` ${streak} `}
                  <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>天</span>
                </p>
              </div>
              <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
              <div className="flex-1 text-center">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>今日任务</p>
                <p className="mt-0.5 font-semibold" style={{ color: due.length > 0 ? 'var(--accent)' : 'var(--text)', fontSize: '17px' }}>
                  {loading ? '–' : due.length}
                  <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}> 词</span>
                </p>
              </div>
            </div>
            {masteredToday > 0 && (
              <p className="mt-2 text-xs text-center font-medium" style={{ color: '#639922' }}>
                今天已掌握 +{masteredToday}
              </p>
            )}
          </div>

          {/* Today's task CTA */}
          <div className="mt-3">
            {loading ? (
              <div className="animate-pulse rounded-xl" style={{ height: '46px', background: 'var(--label-bg)' }} />
            ) : due.length > 0 ? (
              <Link href="/review/session">
                <button
                  style={{ width: '100%', height: '46px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  开始今日复习 →
                </button>
              </Link>
            ) : (
              <p className="text-sm text-center py-1.5" style={{ color: 'var(--muted)' }}>
                {learning.length === 0 && mastered.length === 0
                  ? '去做测验，答错的词会自动来到这里'
                  : <>今天没有复习任务 <ConfettiIcon /></>}
              </p>
            )}
          </div>

          {/* Unit grid */}
          <p className="text-xs font-medium px-1 mt-6 mb-2" style={{ color: 'var(--muted)' }}>单元</p>
          <div className="grid grid-cols-2 gap-2">
            {units.map((unitId) => {
              const n = unitNumber(unitId)
              const lessons = getLessons(unitId)
              const unitWords = new Set(lessons.flatMap((l) => getWords(unitId, l)))
              const unitTotal = unitWords.size
              const unitMastered = loading
                ? null
                : [...unitWords].filter((w) => masteredWords.has(w)).length
              const num = String(n).padStart(2, '0')

              return (
                <Link key={unitId} href={`/unit/${n}`}>
                  <div
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderLeft: '3px solid var(--accent)',
                      borderRadius: '10px',
                    }}
                    className="px-4 py-3.5 flex items-center justify-between hover:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs mb-0.5 font-medium" style={{ color: 'var(--muted)' }}>
                        Unit {num}
                      </p>
                      <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                        {unitMastered !== null && unitMastered > 0 ? `${unitMastered} / ${unitTotal} 词` : `${unitTotal} 词`}
                      </p>
                      <div className="mt-1.5" style={{ height: '3px', borderRadius: '999px', background: 'var(--label-bg)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: '999px',
                            background: 'var(--accent)',
                            width: `${unitMastered !== null && unitTotal > 0 ? (unitMastered / unitTotal) * 100 : 0}%`,
                            transition: 'width 0.5s ease-out',
                          }}
                        />
                      </div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" className="flex-shrink-0 ml-2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
      <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.96)', backdropFilter: 'blur(8px)' }}>
        <BottomTabBar />
      </div>
    </div>
  )
}
