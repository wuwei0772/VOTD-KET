import { getWords, lessonNumber } from '@/lib/vocabulary'
import QuizViewer from '@/components/QuizViewer'
import { notFound } from 'next/navigation'

export default async function LessonQuizPage({
  params,
}: {
  params: Promise<{ unitId: string; lessonId: string }>
}) {
  const { unitId: rawUnit, lessonId: rawLesson } = await params
  const unitId = `unit${rawUnit}`
  const lessonId = `lesson${rawLesson}`

  const words = getWords(unitId, lessonId)
  if (words.length === 0) notFound()

  return (
    <QuizViewer
      words={words}
      unitId={rawUnit}
      lessonId={rawLesson}
      backHref={`/unit/${rawUnit}/lesson/${rawLesson}`}
      backLabel={`Lesson ${lessonNumber(lessonId)}`}
    />
  )
}
