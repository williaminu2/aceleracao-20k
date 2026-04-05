'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'

interface CreatePostProps {
  currentUser: { id: string; name: string; avatar?: string | null }
  channel: string
  adminOnly?: boolean
  onPost: () => void
}

export function CreatePost({ currentUser, channel, adminOnly, onPost }: CreatePostProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkRole() {
      const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
      setIsAdmin(data?.role === 'admin')
    }
    checkRole()
  }, [currentUser.id])

  // Canal restrito a admins e usuário não é admin
  if (adminOnly && !isAdmin) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Somente administradores da comunidade podem Compartilhar neste Canal.
        </p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!content.trim() || loading) return
    setLoading(true)
    await supabase.from('posts').insert({
      author_id: currentUser.id,
      channel: channel,
      content: content.trim(),
    })
    setContent('')
    setOpen(false)
    setLoading(false)
    onPost()
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      {!open ? (
        <div className="flex items-center gap-3 cursor-text" onClick={() => setOpen(true)}>
          <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
          <div className="flex-1 px-4 py-2 bg-zinc-100 rounded-full text-sm text-zinc-400 hover:bg-zinc-200 transition">
            No que está pensando, {currentUser.name.split(' ')[0]}?
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
            <span className="text-sm font-semibold text-zinc-900">{currentUser.name}</span>
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Compartilhe algo com a comunidade..."
            className="w-full min-h-[100px] text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setContent('') }}
              className="px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-full transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || loading}
              className="px-4 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-full transition flex items-center gap-2"
            >
              {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Publicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
