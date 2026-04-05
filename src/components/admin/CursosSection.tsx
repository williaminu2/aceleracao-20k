'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Pencil, Loader2, ChevronDown, ChevronUp,
  BookOpen, GripVertical, X, Check
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id: string
  title: string
  video_url: string | null
  duration_minutes: number
  order_index: number
}

interface Module {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  instructor_name: string | null
  instructor_bio: string | null
  instructor_avatar: string | null
  published: boolean
  order_index: number
  modules: Module[]
}

const EMPTY_COURSE = {
  title: '',
  description: '',
  thumbnail_url: '',
  instructor_name: '',
  instructor_bio: '',
  instructor_avatar: '',
  published: true,
}

export function CursosSection() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modal curso
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [savingCourse, setSavingCourse] = useState(false)

  // Modal módulo
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [moduleParentId, setModuleParentId] = useState<string | null>(null)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [moduleTitle, setModuleTitle] = useState('')
  const [savingModule, setSavingModule] = useState(false)

  // Modal aula
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [lessonParentModuleId, setLessonParentModuleId] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonForm, setLessonForm] = useState({ title: '', video_url: '', duration_minutes: '' })
  const [savingLesson, setSavingLesson] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('courses')
      .select(`id, title, description, thumbnail_url, instructor_name, instructor_bio, instructor_avatar, published, order_index,
        modules (id, title, order_index, lessons (id, title, video_url, duration_minutes, order_index))`)
      .order('order_index')
    if (data) {
      setCourses(data.map((c: any) => ({
        ...c,
        modules: (c.modules || []).sort((a: any, b: any) => a.order_index - b.order_index).map((m: any) => ({
          ...m,
          lessons: (m.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index),
        }))
      })))
    }
    setLoading(false)
  }

  // ── Curso ──────────────────────────────────────────────────────────────────

  function openNewCourse() {
    setEditingCourse(null)
    setCourseForm(EMPTY_COURSE)
    setShowCourseModal(true)
  }

  function openEditCourse(c: Course) {
    setEditingCourse(c)
    setCourseForm({
      title: c.title,
      description: c.description || '',
      thumbnail_url: c.thumbnail_url || '',
      instructor_name: c.instructor_name || '',
      instructor_bio: c.instructor_bio || '',
      instructor_avatar: c.instructor_avatar || '',
      published: c.published,
    })
    setShowCourseModal(true)
  }

  async function saveCourse() {
    if (!courseForm.title.trim() || savingCourse) return
    setSavingCourse(true)
    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || null,
      thumbnail_url: courseForm.thumbnail_url.trim() || null,
      instructor_name: courseForm.instructor_name.trim() || null,
      instructor_bio: courseForm.instructor_bio.trim() || null,
      instructor_avatar: courseForm.instructor_avatar.trim() || null,
      published: courseForm.published,
    }
    if (editingCourse) {
      await supabase.from('courses').update(payload).eq('id', editingCourse.id)
    } else {
      const maxOrder = courses.length > 0 ? Math.max(...courses.map(c => c.order_index)) + 1 : 1
      await supabase.from('courses').insert({ ...payload, order_index: maxOrder })
    }
    setShowCourseModal(false)
    await load()
    setSavingCourse(false)
  }

  async function deleteCourse(id: string) {
    if (!confirm('Excluir este curso e todos os seus módulos e aulas?')) return
    setDeleting(id)
    await supabase.from('courses').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  async function togglePublish(c: Course) {
    await supabase.from('courses').update({ published: !c.published }).eq('id', c.id)
    await load()
  }

  // ── Módulo ─────────────────────────────────────────────────────────────────

  function openNewModule(courseId: string) {
    setModuleParentId(courseId)
    setEditingModule(null)
    setModuleTitle('')
    setShowModuleModal(true)
  }

  function openEditModule(courseId: string, m: Module) {
    setModuleParentId(courseId)
    setEditingModule(m)
    setModuleTitle(m.title)
    setShowModuleModal(true)
  }

  async function saveModule() {
    if (!moduleTitle.trim() || savingModule || !moduleParentId) return
    setSavingModule(true)
    if (editingModule) {
      await supabase.from('modules').update({ title: moduleTitle.trim() }).eq('id', editingModule.id)
    } else {
      const course = courses.find(c => c.id === moduleParentId)
      const maxOrder = course && course.modules.length > 0
        ? Math.max(...course.modules.map(m => m.order_index)) + 1 : 1
      await supabase.from('modules').insert({ course_id: moduleParentId, title: moduleTitle.trim(), order_index: maxOrder })
    }
    setShowModuleModal(false)
    await load()
    setSavingModule(false)
  }

  async function deleteModule(id: string) {
    if (!confirm('Excluir este módulo e todas as suas aulas?')) return
    setDeleting(id)
    await supabase.from('modules').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  // ── Aula ───────────────────────────────────────────────────────────────────

  function openNewLesson(moduleId: string) {
    setLessonParentModuleId(moduleId)
    setEditingLesson(null)
    setLessonForm({ title: '', video_url: '', duration_minutes: '' })
    setShowLessonModal(true)
  }

  function openEditLesson(moduleId: string, l: Lesson) {
    setLessonParentModuleId(moduleId)
    setEditingLesson(l)
    setLessonForm({
      title: l.title,
      video_url: l.video_url || '',
      duration_minutes: l.duration_minutes?.toString() || '',
    })
    setShowLessonModal(true)
  }

  async function saveLesson() {
    if (!lessonForm.title.trim() || savingLesson || !lessonParentModuleId) return
    setSavingLesson(true)
    const payload = {
      title: lessonForm.title.trim(),
      video_url: lessonForm.video_url.trim() || null,
      duration_minutes: parseInt(lessonForm.duration_minutes) || 0,
    }
    if (editingLesson) {
      await supabase.from('lessons').update(payload).eq('id', editingLesson.id)
    } else {
      // Encontrar o módulo para calcular order_index
      let maxOrder = 1
      for (const c of courses) {
        const mod = c.modules.find(m => m.id === lessonParentModuleId)
        if (mod) {
          maxOrder = mod.lessons.length > 0 ? Math.max(...mod.lessons.map(l => l.order_index)) + 1 : 1
          break
        }
      }
      await supabase.from('lessons').insert({ module_id: lessonParentModuleId, ...payload, order_index: maxOrder })
    }
    setShowLessonModal(false)
    await load()
    setSavingLesson(false)
  }

  async function deleteLesson(id: string) {
    if (!confirm('Excluir esta aula?')) return
    setDeleting(id)
    await supabase.from('lessons').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-zinc-900">Cursos</h2>
        <button onClick={openNewCourse}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition">
          <Plus size={15} /> Novo curso
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-zinc-400">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum curso criado ainda</p>
        </div>
      ) : courses.map(course => (
        <div key={course.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {/* Cabeçalho do curso */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-16 h-10 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
              {course.thumbnail_url
                ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-zinc-400" /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-zinc-900 text-sm truncate">{course.title}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${course.published ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {course.published ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {course.modules.length} módulo{course.modules.length !== 1 ? 's' : ''} · {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} aula{course.modules.reduce((acc, m) => acc + m.lessons.length, 0) !== 1 ? 's' : ''}
                {course.instructor_name && ` · ${course.instructor_name}`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => togglePublish(course)} title={course.published ? 'Despublicar' : 'Publicar'}
                className={`p-2 rounded-lg text-xs transition ${course.published ? 'text-green-600 hover:bg-green-50' : 'text-zinc-400 hover:bg-zinc-100'}`}>
                <Check size={15} />
              </button>
              <button onClick={() => openEditCourse(course)}
                className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                <Pencil size={15} />
              </button>
              <button onClick={() => deleteCourse(course.id)} disabled={deleting === course.id}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                {deleting === course.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
              <button onClick={() => setExpandedId(expandedId === course.id ? null : course.id)}
                className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition">
                {expandedId === course.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          </div>

          {/* Módulos e aulas */}
          {expandedId === course.id && (
            <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
              {course.modules.map(mod => (
                <div key={mod.id} className="border border-zinc-100 rounded-xl overflow-hidden">
                  {/* Módulo */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-50">
                    <GripVertical size={14} className="text-zinc-300" />
                    <p className="flex-1 text-sm font-semibold text-zinc-800">{mod.title}</p>
                    <span className="text-xs text-zinc-400">{mod.lessons.length} aula{mod.lessons.length !== 1 ? 's' : ''}</span>
                    <button onClick={() => openNewLesson(mod.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-orange-500 hover:bg-orange-50 rounded-lg transition font-medium">
                      <Plus size={11} /> Aula
                    </button>
                    <button onClick={() => openEditModule(course.id, mod)}
                      className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteModule(mod.id)} disabled={deleting === mod.id}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      {deleting === mod.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>

                  {/* Aulas */}
                  {mod.lessons.map((lesson, li) => (
                    <div key={lesson.id} className={`flex items-center gap-3 px-4 py-2.5 ${li < mod.lessons.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                      <span className="text-xs text-zinc-300 w-4 text-center">{li + 1}</span>
                      <p className="flex-1 text-sm text-zinc-700 truncate">{lesson.title}</p>
                      {lesson.duration_minutes > 0 && (
                        <span className="text-xs text-zinc-400">{lesson.duration_minutes}min</span>
                      )}
                      <button onClick={() => openEditLesson(mod.id, lesson)}
                        className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteLesson(lesson.id)} disabled={deleting === lesson.id}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        {deleting === lesson.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              <button onClick={() => openNewModule(course.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-300 text-sm text-zinc-500 hover:text-orange-500 hover:border-orange-400 rounded-xl transition">
                <Plus size={14} /> Adicionar módulo
              </button>
            </div>
          )}
        </div>
      ))}

      {/* ── Modal Curso ─────────────────────────────────────────────────── */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCourseModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">{editingCourse ? 'Editar curso' : 'Novo curso'}</h3>
              <button onClick={() => setShowCourseModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Título *" value={courseForm.title} onChange={v => setCourseForm(f => ({ ...f, title: v }))} placeholder="Ex: Revit para Escritórios BIM" />
              <Field label="Descrição" value={courseForm.description} onChange={v => setCourseForm(f => ({ ...f, description: v }))} placeholder="Breve descrição do curso" textarea />
              <Field label="URL da capa (thumbnail)" value={courseForm.thumbnail_url} onChange={v => setCourseForm(f => ({ ...f, thumbnail_url: v }))} placeholder="https://..." />

              <div className="border-t border-zinc-100 pt-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Professor</p>
                <div className="space-y-3">
                  <Field label="Nome do professor" value={courseForm.instructor_name} onChange={v => setCourseForm(f => ({ ...f, instructor_name: v }))} placeholder="Ex: William Alves" />
                  <Field label="Bio" value={courseForm.instructor_bio} onChange={v => setCourseForm(f => ({ ...f, instructor_bio: v }))} placeholder="Breve apresentação" textarea />
                  <Field label="Foto (URL)" value={courseForm.instructor_avatar} onChange={v => setCourseForm(f => ({ ...f, instructor_avatar: v }))} placeholder="https://..." />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setCourseForm(f => ({ ...f, published: !f.published }))}
                  className={`w-10 h-6 rounded-full transition relative ${courseForm.published ? 'bg-orange-500' : 'bg-zinc-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${courseForm.published ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm font-medium text-zinc-700">Publicado</span>
              </label>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setShowCourseModal(false)}
                className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button onClick={saveCourse} disabled={!courseForm.title.trim() || savingCourse}
                className="flex-1 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {savingCourse && <Loader2 size={14} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Módulo ────────────────────────────────────────────────── */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModuleModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">{editingModule ? 'Editar módulo' : 'Novo módulo'}</h3>
              <button onClick={() => setShowModuleModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>
            <Field label="Título do módulo *" value={moduleTitle} onChange={setModuleTitle} placeholder="Ex: Módulo 1 — Fundamentos" />
            <div className="flex gap-2">
              <button onClick={() => setShowModuleModal(false)}
                className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button onClick={saveModule} disabled={!moduleTitle.trim() || savingModule}
                className="flex-1 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {savingModule && <Loader2 size={14} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Aula ──────────────────────────────────────────────────── */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowLessonModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">{editingLesson ? 'Editar aula' : 'Nova aula'}</h3>
              <button onClick={() => setShowLessonModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>
            <Field label="Título da aula *" value={lessonForm.title} onChange={v => setLessonForm(f => ({ ...f, title: v }))} placeholder="Ex: Introdução ao Revit" />
            <Field label="URL do vídeo" value={lessonForm.video_url} onChange={v => setLessonForm(f => ({ ...f, video_url: v }))} placeholder="https://youtube.com/watch?v=..." />
            <Field label="Duração (minutos)" value={lessonForm.duration_minutes} onChange={v => setLessonForm(f => ({ ...f, duration_minutes: v }))} placeholder="Ex: 25" type="number" />
            <div className="flex gap-2">
              <button onClick={() => setShowLessonModal(false)}
                className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button onClick={saveLesson} disabled={!lessonForm.title.trim() || savingLesson}
                className="flex-1 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {savingLesson && <Loader2 size={14} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Campo reutilizável ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, textarea, type }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; textarea?: boolean; type?: string
}) {
  const cls = "w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls + " resize-none"} />
        : <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}
