'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X, FileText, BookOpen, Calendar, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'

interface SearchResult {
  type: 'post' | 'course' | 'event' | 'member'
  id: string
  title: string
  subtitle?: string
  avatar?: string | null
  meta?: string
}

interface SearchModalProps {
  onClose: () => void
  onNavigate?: (tab: string) => void
}

export function SearchModal({ onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query])

  async function search(q: string) {
    setLoading(true)
    const term = `%${q}%`
    const all: SearchResult[] = []

    const [posts, courses, events, members] = await Promise.all([
      supabase.from('posts').select('id, content, channel, created_at, profiles(full_name, avatar_url)')
        .ilike('content', term).limit(5),
      supabase.from('courses').select('id, title, description').ilike('title', term).limit(4),
      supabase.from('events').select('id, title, event_date').ilike('title', term).limit(4),
      supabase.from('profiles').select('id, full_name, avatar_url, title').ilike('full_name', term).limit(4),
    ])

    posts.data?.forEach((p: any) => all.push({
      type: 'post', id: p.id,
      title: p.content.slice(0, 80) + (p.content.length > 80 ? '…' : ''),
      subtitle: `em ${p.channel}`,
      avatar: p.profiles?.avatar_url,
      meta: timeAgo(p.created_at),
    }))

    courses.data?.forEach((c: any) => all.push({
      type: 'course', id: c.id,
      title: c.title,
      subtitle: c.description?.slice(0, 60),
    }))

    events.data?.forEach((e: any) => all.push({
      type: 'event', id: e.id,
      title: e.title,
      subtitle: new Date(e.event_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    }))

    members.data?.forEach((m: any) => all.push({
      type: 'member', id: m.id,
      title: m.full_name || 'Membro',
      subtitle: m.title || '',
      avatar: m.avatar_url,
    }))

    setResults(all)
    setLoading(false)
  }

  const typeIcon: Record<string, any> = {
    post: FileText,
    course: BookOpen,
    event: Calendar,
    member: Hash,
  }

  const typeLabel: Record<string, string> = {
    post: 'Postagem',
    course: 'Curso',
    event: 'Evento',
    member: 'Membro',
  }

  const typeTab: Record<string, string> = {
    post: 'Discussão',
    course: 'Aprendizado',
    event: 'Eventos',
    member: 'Membros',
  }

  function handleSelect(r: SearchResult) {
    onNavigate?.(typeTab[r.type])
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100">
          <Search size={18} className="text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar postagens, cursos, eventos, membros..."
            className="flex-1 text-sm outline-none text-zinc-900 placeholder:text-zinc-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-zinc-100 rounded-lg transition">
              <X size={15} className="text-zinc-400" />
            </button>
          )}
          <button onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 px-2 py-1 rounded-lg transition">
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {!query && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Digite para pesquisar</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <p className="text-sm">Nenhum resultado para <strong className="text-zinc-600">"{query}"</strong></p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((r, i) => {
                const Icon = typeIcon[r.type]
                return (
                  <button key={`${r.type}-${r.id}-${i}`} onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition text-left">
                    {r.type === 'post' || r.type === 'member' ? (
                      <Avatar name={r.title} src={r.avatar} size="sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={15} className="text-orange-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-zinc-400 truncate mt-0.5">{r.subtitle}</p>}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {typeLabel[r.type]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
