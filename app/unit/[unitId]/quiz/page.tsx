import { getLessons, getWords } from '@/lib/vocabulary'
import QuizViewer from '@/components/QuizViewer'
import { notFound } from 'next/navigation'

export default async function UnitQuizPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId: rawUnit } = await params
  const unitId = `unit${rawUnit}`
  const lessons = getLessons(unitId)
  if (lessons.length === 0) notFound()

  const words = lessons.flatMap(l => getWords(unitId, l))

  return (
    <QuizViewer
      words={words}
      unitId={rawUnit}
      lessonId="all"
      backHref={`/unit/${rawUnit}`}
      backLabel={`Unit ${rawUnit}`}
    />
  )
}
