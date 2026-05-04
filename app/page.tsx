import Link from 'next/link'
import { getUnits, getLessons, getWords, unitNumber } from '@/lib/vocabulary'

export default function HomePage() {
  const units = getUnits()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md mx-auto px-4 pt-12 pb-10">

        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              VOTD
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              KET Vocabulary Builder
            </p>
          </div>
          <Link
            href="/notebook"
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            笔记本
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {units.map((unitId) => {
            const n = unitNumber(unitId)
            const lessons = getLessons(unitId)
            const total = lessons.reduce((sum, l) => sum + getWords(unitId, l).length, 0)
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
                  <div>
                    <p className="text-xs mb-0.5 font-medium" style={{ color: 'var(--muted)' }}>
                      Unit {num}
                    </p>
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                      {total} 词
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {lessons.length} 课时
                    </p>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </div>
  )
}
