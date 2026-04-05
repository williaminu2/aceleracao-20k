'use client'

import { useEffect, useState } from 'react'
import { Search, Clock, Calendar } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'

interface Member {
  id: string
  full_name: string
  avatar_url: string | null
  username: string | null
  bio: string | null
  last_seen_at: string | null
  created_at: string
  role: string
  level: number
}

const FILTERS = [
  { key: 'member', label: 'Ativo' },
  { key: 'admin', label: 'Administradores' },
  { key: 'collaborator', label: 'Colaboradores' },
]

function formatJoinDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function generateUsername(name: string, id: string) {
  return '@' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + id.slice(0, 6)
}

export function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [filtered, setFiltered] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('member')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMembers() }, [])

  useEffect(() => {
    let list = members

    if (activeFilter === 'admin') {
      list = list.filter(m => m.role === 'admin')
    } else if (activeFilter === 'collaborator') {
      list = list.filter(m => m.role === 'collaborator')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.full_name?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.bio?.toLowerCase().includes(q)
      )
    }

    setFiltered(list)
  }, [members, activeFilter, search])

  async function loadMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, bio, last_seen_at, created_at, role, level')
      .order('created_at', { ascending: false })

    if (data) {
      setMembers(data)
      setCounts({
        member: data.length,
        admin: data.filter(m => m.role === 'admin').length,
        collaborator: data.filter(m => m.role === 'collaborator').length,
      })
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros e busca */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === f.key
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-48 max-w-xs relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar Membro..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
        </div>
      </div>

      {/* Lista de membros */}
      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            Nenhum membro encontrado
          </div>
        ) : (
          filtered.map((member) => (
            <div key={member.id} className="flex items-start gap-4 p-4 hover:bg-zinc-50 transition">
              <Avatar
                name={member.full_name || 'Membro'}
                src={member.avatar_url}
                size="md"
                level={member.level || 0}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-zinc-900 text-sm">{member.full_name || 'Membro'}</p>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {member.username || generateUsername(member.full_name || 'membro', member.id)}
                </p>
                {member.bio && (
                  <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed line-clamp-2">{member.bio}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  {member.last_seen_at && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock size={12} />
                      <span>Ativo {timeAgo(member.last_seen_at)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar size={12} />
                    <span>Entrou {formatJoinDate(member.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
