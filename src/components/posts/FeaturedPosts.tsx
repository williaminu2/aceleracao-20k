'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { PostCard, Post } from './PostCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface FeaturedPostsProps {
  channel: string // label do canal ativo, '' = início (todos os canais)
}

export function FeaturedPosts({ channel }: FeaturedPostsProps) {
  const { user } = useAuth()
  const [featured, setFeatured] = useState<Post[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!user) return
    setIndex(0)

    async function load() {
      let query = supabase
        .from('posts')
        .select(`
          id, channel, content, pinned, created_at,
          profiles (id, full_name, avatar_url, level),
          likes (user_id),
          comments (id)
        `)
        .eq('pinned', true)
        .order('created_at', { ascending: false })

      if (channel) {
        query = query.eq('channel', channel)
      }

      const { data } = await query

      if (data) {
        const mapped: Post[] = data.map((p: any) => ({
          id: p.id,
          author: p.profiles?.full_name || 'Membro',
          authorId: p.profiles?.id || null,
          authorAvatar: p.profiles?.avatar_url || null,
          authorLevel: p.profiles?.level || 0,
          channel: p.channel,
          content: p.content,
          likes: p.likes?.length ?? 0,
          comments: p.comments?.length ?? 0,
          createdAt: p.created_at,
          pinned: p.pinned,
          likedByMe: p.likes?.some((l: any) => l.user_id === user!.id) ?? false,
        }))
        setFeatured(mapped)
      }
    }

    load()
  }, [user, channel])

  if (featured.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-zinc-900">Em destaque</h3>
        <Info size={13} className="text-zinc-400" />
        <div className="flex-1" />
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition"
        >
          <ChevronLeft size={16} className="text-zinc-500" />
        </button>
        <span className="text-xs text-zinc-400">{index + 1}/{featured.length}</span>
        <button
          onClick={() => setIndex(Math.min(featured.length - 1, index + 1))}
          disabled={index === featured.length - 1}
          className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition"
        >
          <ChevronRight size={16} className="text-zinc-500" />
        </button>
      </div>
      <PostCard post={featured[index]} featured />
    </div>
  )
}
