'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, CheckCircle, Circle, UserCircle, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Course } from './CourseList'

interface Lesson {
  id: string
  title: string
  video_url: string | null
  thumbnail_url?: string | null
  duration_minutes: number
  courseTitle: string
  moduleTitle: string
}

interface LessonPlayerProps {
  lesson: Lesson
  course: Course & {
    instructor_name?: string | null
    instructor_bio?: string | null
    instructor_avatar?: string | null
  }
  onBack: () => void
  onSelectLesson: (lesson: Lesson) => void
  onComplete: (lessonId: string) => void
}

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  if (url.includes('pandavideo') || url.includes('embed')) return url

  return null
}

export function LessonPlayer({ lesson, course, onBack, onSelectLesson, onComplete }: LessonPlayerProps) {
  const [completed, setCompleted] = useState(false)
  const [progress, setProgress] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')

  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, courseTitle: course.title }))
  )
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id)
  const nextLesson = allLessons[currentIndex + 1] ?? null

  useEffect(() => {
    loadProgress()
  }, [lesson.id])

  async function loadProgress() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
    if (data) {
      const completedIds = new Set(data.filter((p: any) => p.completed).map((p: any) => p.lesson_id))
      setProgress(completedIds)
      setCompleted(completedIds.has(lesson.id))
    }
  }

  async function handleToggleComplete() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const newCompleted = !completed
    await supabase.from('lesson_progress').upsert({
      user_id: user.id,
      lesson_id: lesson.id,
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    setCompleted(newCompleted)
    setProgress((prev) => {
      const next = new Set(prev)
      newCompleted ? next.add(lesson.id) : next.delete(lesson.id)
      return next
    })
    if (newCompleted) onComplete(lesson.id)
    setSaving(false)
  }

  const embedUrl = lesson.video_url ? getEmbedUrl(lesson.video_url) : null

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-zinc-400 mb-3 flex-wrap">
        <button onClick={onBack} className="hover:text-orange-500 transition">{lesson.courseTitle}</button>
        <ChevronRight size={12} />
        <span>{lesson.moduleTitle}</span>
        <ChevronRight size={12} />
        <span className="text-zinc-600 font-medium truncate">{lesson.title}</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="flex gap-4 items-start">

        {/* Coluna esquerda */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Player */}
          <div className="bg-black rounded-xl overflow-hidden aspect-video w-full">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : lesson.video_url ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <p className="text-zinc-400 text-sm">Clique abaixo para assistir</p>
                <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                  Abrir vídeo
                </a>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-zinc-500 text-sm">Nenhum vídeo disponível</p>
              </div>
            )}
          </div>

          {/* Sobre esta aula */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
            <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Sobre esta aula</p>

            {/* Botão concluído */}
            <button
              onClick={handleToggleComplete}
              disabled={saving}
              className={`w-full py-2.5 rounded-lg border-2 text-sm font-semibold transition ${
                completed
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-zinc-300 text-zinc-500 hover:border-orange-500 hover:text-orange-500'
              }`}
            >
              {completed ? 'Concluído ✓' : 'Marcar como concluída'}
            </button>

            {/* Próxima aula */}
            {nextLesson && (
              <button
                onClick={() => onSelectLesson({ ...nextLesson, video_url: nextLesson.video_url ?? null, thumbnail_url: nextLesson.thumbnail_url ?? null })}
                className="w-full flex items-center gap-3 p-3 bg-zinc-50 hover:bg-orange-50 border border-zinc-200 rounded-xl transition text-left group"
              >
                <div className="w-16 h-11 rounded-md overflow-hidden flex-shrink-0 bg-zinc-200">
                  {nextLesson.thumbnail_url || course.thumbnail_url ? (
                    <img src={nextLesson.thumbnail_url || course.thumbnail_url || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-orange-500 font-semibold">Incrível! Continue avançando!</p>
                  <p className="text-sm text-zinc-700 truncate mt-0.5">{nextLesson.title}</p>
                </div>
                <span className="text-xs text-zinc-400 flex-shrink-0 group-hover:text-orange-500 transition">
                  Próxima aula &gt;
                </span>
              </button>
            )}
          </div>

          {/* Comentários */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
            <h3 className="text-base font-bold text-orange-500 text-center">Comentários</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Digite seu comentário aqui..."
              className="w-full min-h-[80px] text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{comment.length} a 2400</span>
              <button
                disabled={!comment.trim()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
              >
                <Send size={13} />
                Publicar
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita — sidebar */}
        <div className="w-72 flex-shrink-0 space-y-3">

          {/* Lista de aulas */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <p className="text-white font-semibold text-sm truncate">{course.title}</p>
              <span className="text-zinc-400 text-xs flex-shrink-0 ml-2">{allLessons.length} Aulas</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {allLessons.map((l, index) => {
                const done = progress.has(l.id)
                const isActive = l.id === lesson.id
                return (
                  <button
                    key={l.id}
                    onClick={() => onSelectLesson({ ...l, video_url: l.video_url ?? null, thumbnail_url: l.thumbnail_url ?? null })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-zinc-800 last:border-0 transition text-left ${
                      isActive ? 'bg-zinc-700' : 'hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-zinc-500 text-xs w-4 flex-shrink-0">{index + 1}</span>
                    <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 bg-zinc-700">
                      {l.thumbnail_url || course.thumbnail_url ? (
                        <img src={l.thumbnail_url || course.thumbnail_url || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-600" />
                      )}
                    </div>
                    <p className={`flex-1 text-xs leading-tight line-clamp-2 ${isActive ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                      {l.title}
                    </p>
                    {done && <CheckCircle size={13} className="text-green-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Instrutor */}
          {(course.instructor_name || course.instructor_bio) && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="font-bold text-zinc-900 text-sm mb-3">Instrutor</p>
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
