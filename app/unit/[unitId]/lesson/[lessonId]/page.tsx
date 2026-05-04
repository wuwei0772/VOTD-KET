import { getWords, lessonNumber } from '@/lib/vocabulary'
import WordCardViewer from '@/components/WordCardViewer'
import { notFound } from 'next/navigation'

export default async function LessonPage({
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
    <WordCardViewer
      words={words}
      unitNum={parseInt(rawUnit, 10)}
      lessonNum={lessonNumber(lessonId)}
      unitId={rawUnit}
      lessonId={rawLesson}
    />
  )
}
