'use client'

import { useEffect, useState } from 'react'
import { Lock, Zap } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { getLevelInfo } from '@/lib/levels'
import { MemberProfileModal } from '@/components/membros/MemberProfileModal'

interface Stats {
  members: number
  posts: number
  admins: number
  courses: number
}

interface AdminProfile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface TopMember {
  id: string
  full_name: string
  avatar_url: string | null
  level: number
  points: number
}

export function RightSidebar() {
  const [stats, setStats] = useState<Stats>({ members: 0, posts: 0, admins: 0, courses: 0 })
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [topMembers, setTopMembers] = useState<TopMember[]>([])
  const [loading, setLoading] = useState(true)
  const [profileModalId, setProfileModalId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [membersRes, postsRes, adminsRes, coursesRes, profilesRes, allPostsRes, allCommentsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, full_name, avatar_url').eq('role', 'admin'),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, full_name, avatar_url, level'),
      supabase.from('posts').select('author_id'),
      supabase.from('comments').select('author_id'),
    ])

    setStats({
      members: membersRes.count ?? 0,
      posts: postsRes.count ?? 0,
      admins: adminsRes.data?.length ?? 0,
      courses: coursesRes.count ?? 0,
    })

    if (adminsRes.data) setAdmins(adminsRes.data)

    if (profilesRes.data) {
      const postCounts: Record<string, number> = {}
      const commentCounts: Record<string, number> = {}

      allPostsRes.data?.forEach((p: any) => {
        postCounts[p.author_id] = (postCounts[p.author_id] || 0) + 1
      })
      allCommentsRes.data?.forEach((c: any) => {
        commentCounts[c.author_id] = (commentCounts[c.author_id] || 0) + 1
      })

      const withPoints: TopMember[] = profilesRes.data.map((p: any) => ({
        ...p,
        points: (postCounts[p.id] || 0) * 5 + (commentCounts[p.id] || 0) * 2,
      }))

      const sorted = withPoints.sort((a, b) => b.points - a.points).slice(0, 5)
      setTopMembers(sorted)
    }

    setLoading(false)
  }

  const medals: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

  return (
    <>
      <aside className="w-72 bg-white border-l border-zinc-200 flex flex-col h-full overflow-y-auto flex-shrink-0">
        {/* Capa */}
        <div className="bg-black h-32 flex items-center justify-center flex-shrink-0">
          <div className="text-center">
            <p className="text-orange-500 font-black text-xl leading-none">Aceleração</p>
            <p className="text-white font-black text-3xl leading-none">20K</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Info */}
          <div>
            <h2 className="font-bold text-zinc-900 text-sm">Programa de Aceleração 20K</h2>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              <Lock size={11} />
              <span>Grupo privado</span>
            </div>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Aqui você aprende, implementa e evolui usando o Método BIM Pro — direto, prático e focado em previsibilidade nas vendas.
            </p>
          </div>

          {/* Stats reais */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-zinc-100">
            <div className="text-center">
              <p className="text-base font-bold text-zinc-900">
                {loading ? '—' : stats.members}
              </p>
              <p className="text-[11px] text-zinc-500">Membros</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-zinc-900">
                {loading ? '—' : stats.posts}
              </p>
              <p className="text-[11px] text-zinc-500">Publicações</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-zinc-900">
                {loading ? '—' : stats.admins}
              </p>
              <p className="text-[11px] text-zinc-500">Administradores</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-zinc-900">
                {loading ? '—' : stats.courses}
              </p>
              <p className="text-[11px] text-zinc-500">Cursos</p>
            </div>
          </div>

          {/* Avatares dos admins */}
          {admins.length > 0 && (
            <div className="flex -space-x-2">
              {admins.slice(0, 8).map((a) => (
                <button key={a.id} onClick={() => setProfileModalId(a.id)}>
                  <Avatar name={a.full_name || 'Admin'} src={a.avatar_url} size="sm" />
                </button>
              ))}
              {admins.length > 8 && (
                <div className="w-8 h-8 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                  +{admins.length - 8}
                </div>
              )}
            </div>
          )}

          {/* Top membros por pontos */}
          {topMembers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Zap size={13} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-zinc-900">Top membros por pontos</h3>
              </div>
              <div className="space-y-3">
                {topMembers.map((m, i) => {
                  const lvl = getLevelInfo(m.level || 0)
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-sm w-5 text-center flex-shrink-0">
                        {medals[i] ?? <span className="text-xs text-zinc-400 font-bold">{i + 1}</span>}
                      </span>
                      <button onClick={() => setProfileModalId(m.id)}>
                        <Avatar name={m.full_name || 'Membro'} src={m.avatar_url} size="sm" />
                      </button>
                      <button
                        className="flex-1 text-xs text-zinc-700 truncate text-left hover:text-orange-500 transition"
                        onClick={() => setProfileModalId(m.id)}
                      >
                        {m.full_name}
                      </button>
                      <div className="flex items-center gap-0.5 text-orange-500 font-bold text-xs flex-shrink-0">
                        <Zap size={10} />
                        {m.points}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {profileModalId && (
        <MemberProfileModal memberId={profileModalId} onClose={() => setProfileModalId(null)} />
      )}
    </>
  )
}
