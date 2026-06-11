import Link from 'next/link'
import { getLessons, getWords, lessonNumber } from '@/lib/vocabulary'
import { notFound } from 'next/navigation'

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId: rawId } = await params
  const unitId = `unit${rawId}`
  const lessons = getLessons(unitId)

  if (lessons.length === 0) notFound()

  const unitNum = String(parseInt(rawId, 10)).padStart(2, '0')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md mx-auto px-4 py-8">

        <header className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
          </Link>
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Unit {unitNum}</p>
            <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              选择课时
            </h1>
          </div>
          <Link
            href={`/unit/${rawId}/quiz`}
            style={{ background: 'var(--accent)', color: '#fff', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 500 }}
            className="hover:opacity-85 transition-opacity"
          >
            单元测试
          </Link>
        </header>

        <div className="flex flex-col gap-2">
          {lessons.map((lessonId) => {
            const n = lessonNumber(lessonId)
            const words = getWords(unitId, lessonId)

            return (
              <div
                key={lessonId}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px' }}
                className="px-4 py-3.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    style={{ background: 'var(--accent-soft)', borderRadius: '8px' }}
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{n}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Lesson {n}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{words.length} 个词汇</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    href={`/unit/${rawId}/lesson/${n}`}
                    style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: '7px', padding: '5px 10px' }}
                    className="hover:opacity-75 transition-opacity"
                  >
                    学习
                  </Link>
                  <Link
                    href={`/unit/${rawId}/lesson/${n}/quiz`}
                    style={{ fontSize: '12px', fontWeight: 500, color: '#fff', background: 'var(--accent)', borderRadius: '7px', padding: '5px 10px' }}
                    className="hover:opacity-85 transition-opacity"
                  >
                    测试
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
