'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id: string
  title: string
  video_url?: string | null
  thumbnail_url?: string | null
  duration_minutes: number
  order_index: number
}

interface Module {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  instructor_name?: string | null
  instructor_bio?: string | null
  instructor_avatar?: string | null
  modules: Module[]
}

interface CourseListProps {
  onSelectCourse: (course: Course) => void
}

export function CourseList({ onSelectCourse }: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [progress, setProgress] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  async function loadCourses() {
    const { data: coursesData } = await supabase
      .from('courses')
      .select(`
        id, title, description, thumbnail_url,
        instructor_name, instructor_bio, instructor_avatar,
        modules (
          id, title, order_index,
          lessons (id, title, video_url, thumbnail_url, duration_minutes, order_index)
        )
      `)
      .eq('published', true)
      .order('order_index')

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)

      if (progressData) {
        setProgress(new Set(progressData.map((p: any) => p.lesson_id)))
      }
    }

    if (coursesData) {
      const sorted = coursesData.map((c: any) => ({
        ...c,
        modules: (c.modules || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((m: any) => ({
            ...m,
            lessons: (m.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index),
          })),
      }))
      setCourses(sorted)
    }

    setLoading(false)
  }

  function getProgress(course: Course) {
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const total = allLessons.length
    if (total === 0) return { completed: 0, total: 0, percent: 0 }
    const completed = allLessons.filter((l) => progress.has(l.id)).length
    return { completed, total, percent: Math.round((completed / total) * 100) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen size={40} className="text-zinc-300 mb-4" />
        <p className="text-zinc-500 font-medium">Nenhum curso disponível ainda</p>
        <p className="text-zinc-400 text-sm mt-1">Os conteúdos serão publicados em breve!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => {
        const { percent } = getProgress(course)

        return (
          <div
            key={course.id}
            className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
          >
            {/* Thumbnail */}
            <div className="aspect-video w-full bg-zinc-900 overflow-hidden">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <BookOpen size={32} className="text-zinc-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col flex-1 gap-3">
              <h3 className="font-semibold text-zinc-900 text-sm leading-snug line-clamp-2">
                {course.title}
              </h3>

              {/* Barra de progresso */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{percent}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Botão */}
              <button
                onClick={() => onSelectCourse(course)}
                className="mt-auto w-full py-2.5 border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
              >
                ABRIR
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
