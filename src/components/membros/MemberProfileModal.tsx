'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, ExternalLink, MapPin, Star } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { getLevelInfo } from '@/lib/levels'

interface MemberProfile {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  title: string | null
  level: number
  linkedin: string | null
  instagram: string | null
  website: string | null
  created_at: string
  role: string
}

interface MemberProfileModalProps {
  memberId: string
  onClose: () => void
}

export function MemberProfileModal({ memberId, onClose }: MemberProfileModalProps) {
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [stats, setStats] = useState({ posts: 0, comments: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [memberId])

  async function load() {
    const [profileRes, postsRes, commentsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, title, level, linkedin, instagram, website, created_at, role')
        .eq('id', memberId)
        .single(),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', memberId),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', memberId),
    ])

    if (profileRes.data) setProfile(profileRes.data as MemberProfile)
    setStats({ posts: postsRes.count ?? 0, comments: commentsRes.count ?? 0 })
    setLoading(false)
  }

  const points = stats.posts * 5 + stats.comments * 2

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 relative flex-shrink-0">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #ff3b03 0%, transparent 50%)' }} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition"
          >
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <div className="px-5 pb-5">
            {/* Avatar overlapping cover */}
            <div className="-mt-8 mb-3 flex items-end justify-between">
              <div className="border-4 border-white rounded-full shadow-md">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
                      {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </div>
              {/* Role badge */}
              {profile.role === 'admin' && (
                <span className="px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-bold rounded-full">
                  Admin
                </span>
              )}
            </div>

            {/* Name & title */}
            <p className="font-bold text-zinc-900 text-lg leading-tight">{profile.full_name || 'Membro'}</p>
            {profile.title && (
              <p className="text-sm text-zinc-500 mt-0.5">{profile.title}</p>
            )}

            {/* Level badge */}
            {(() => {
              const lvl = getLevelInfo(profile.level || 0)
              return (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-2 mb-3"
                  style={{ background: lvl.color, color: lvl.textColor }}
                >
                  <Star size={10} />
                  {lvl.faixa}
                </div>
              )
            })()}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-zinc-600 leading-relaxed mb-4">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 bg-zinc-50 rounded-xl p-3">
              <div className="text-center">
                <p className="text-base font-bold text-zinc-900">{stats.posts}</p>
                <p className="text-[11px] text-zinc-500">Publicações</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-zinc-900">{stats.comments}</p>
                <p className="text-[11px] text-zinc-500">Comentários</p>
              </div>
              <div className="text-center border-l border-zinc-200">
                <p className="text-base font-bold text-orange-500">{points}</p>
                <p className="text-[11px] text-zinc-500">Pontos</p>
              </div>
            </div>

            {/* Social links */}
            {(profile.linkedin || profile.instagram || profile.website) && (
              <div className="flex gap-2 flex-wrap mb-4">
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition font-medium"
                  >
                    LinkedIn <ExternalLink size={10} />
                  </a>
                )}
                {profile.instagram && (
                  <a
                    href={profile.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-pink-50 text-pink-700 rounded-full hover:bg-pink-100 transition font-medium"
                  >
                    Instagram <ExternalLink size={10} />
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-100 text-zinc-700 rounded-full hover:bg-zinc-200 transition font-medium"
                  >
                    Website <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}

            {/* Join date */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar size={12} />
              <span>
                Membro desde{' '}
                {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-center py-10 text-zinc-400 text-sm">Perfil não encontrado</p>
        )}
      </div>
    </div>
  )
}
