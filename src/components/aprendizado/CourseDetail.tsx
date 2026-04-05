'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle, Clock, Play, UserCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Course } from './CourseList'

interface Lesson {
  id: string
  title: string
  video_url?: string | null
  thumbnail_url?: string | null
  duration_minutes: number
  order_index: number
  courseTitle: string
  moduleTitle: string
}

interface CourseDetailProps {
  course: Course & {
    instructor_name?: string | null
    instructor_bio?: string | null
    instructor_avatar?: string | null
  }
  onBack: () => void
  onSelectLesson: (lesson: Lesson) => void
}

export function CourseDetail({ course, onBack, onSelectLesson }: CourseDetailProps) {
  const [progress, setProgress] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadProgress()
  }, [])

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true)
    if (data) setProgress(new Set(data.map((p: any) => p.lesson_id)))
  }

  // Lista plana de todas as aulas
  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  )
  const completedCount = allLessons.filter((l) => progress.has(l.id)).length
  const total = allLessons.length
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // Próxima aula não concluída
  const nextLesson = allLessons.find((l) => !progress.has(l.id))

  return (
    <div>
      {/* Botão voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-500 transition mb-4"
      >
        <ArrowLeft size={15} />
        Voltar para cursos
      </button>

      {/* Hero banner */}
      <div className="relative w-full h-52 rounded-xl overflow-hidden mb-6">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-600 to-orange-900" />
        )}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-white font-bold text-2xl text-center">{course.title}</h1>
          {nextLesson && (
            <button
              onClick={() => onSelectLesson({ ...nextLesson, video_url: nextLesson.video_url ?? null, thumbnail_url: nextLesson.thumbnail_url ?? null, courseTitle: course.title })}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg transition"
            >
              <Play size={15} />
              {completedCount > 0 ? 'Continuar Curso' : 'Começar Curso'}
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo em duas colunas */}
      <div className="flex gap-5 items-start">

        {/* Coluna esquerda — lista de aulas */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="font-bold text-zinc-900 text-base mb-4">{course.title}</h2>

          <div className="space-y-1">
            {allLessons.map((lesson) => {
              const done = progress.has(lesson.id)
              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson({
                    ...lesson,
                    video_url: lesson.video_url ?? null,
                    thumbnail_url: lesson.thumbnail_url ?? null,
                    courseTitle: course.title,
                  })}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition text-left group"
                >
                  {/* Thumbnail da aula */}
                  <div className="w-16 h-11 rounded-md overflow-hidden flex-shrink-0 bg-zinc-100">
                    {lesson.thumbnail_url || course.thumbnail_url ? (
                      <img
                        src={lesson.thumbnail_url || course.thumbnail_url || ''}
                        alt={lesson.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <Play size={12} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Título */}
                  <span className={`flex-1 text-sm ${done ? 'text-zinc-400' : 'text-zinc-700 group-hover:text-orange-500'} transition-colors`}>
                    {lesson.title}
                    {lesson.duration_minutes > 0 && (
                      <span className="text-zinc-400 text-xs ml-2">· {lesson.duration_minutes}min</span>
                    )}
                  </span>

                  {/* Check */}
                  {done && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Coluna direita */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Progresso */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="font-semibold text-zinc-900 text-sm mb-3">
              {completedCount} de {total} aulas concluídas
            </p>
            <div className="relative h-5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${percent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                {percent}%
              </span>
            </div>
          </div>

          {/* Instrutor */}
          {(course.instructor_name || course.instructor_bio) && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="font-semibold text-zinc-900 text-sm mb-3">Instrutor</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-100">
                  {course.instructor_avatar ? (
                    <img src={course.instructor_avatar} alt={course.instructor_name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={40} className="text-zinc-300" />
                  )}
                </div>
                <div>
                  {course.instructor_name && (
                    <p className="text-sm font-semibold text-zinc-900">{course.instructor_name}</p>
                  )}
                  {course.instructor_bio && (
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{course.instructor_bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
