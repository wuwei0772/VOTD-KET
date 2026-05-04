'use client'

interface FlashCardProps {
  front: React.ReactNode
  back: React.ReactNode
  flipped: boolean
  onClick: () => void
}

export default function FlashCard({ front, back, flipped, onClick }: FlashCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        perspective: '1000px',
        cursor: 'pointer',
        width: '100%',
        height: '420px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.45s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {front}
        </div>

        {/* Back */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {back}
        </div>
      </div>
    </div>
  )
}
