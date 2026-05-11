'use client'

import { useEffect, useState } from 'react'
import { Lock, TrendingUp, Zap, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { LEVELS, getLevelInfo } from '@/lib/levels'
import { SubmitLevelModal } from './SubmitLevelModal'
import { MemberProfileModal } from '@/components/membros/MemberProfileModal'

interface RankedUser {
  id: string
  full_name: string
  avatar_url: string | null
  level: number
  points?: number
}

type Tab = 'nivel' | 'pontos'

const MEDALS: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

export function Leaderboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<RankedUser[]>([])
  const [pendingSubmission, setPendingSubmission] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [updatedAt] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('nivel')
  const [profileModalId, setProfileModalId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)

      const { data: submission } = await supabase
        .from('level_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setPendingSubmission(submission)
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, level')
      .order('level', { ascending: false })

    if (profiles) {
      // fetch posts and comments counts to compute points
      const [postsRes, commentsRes] = await Promise.all([
        supabase.from('posts').select('author_id'),
        supabase.from('comments').select('author_id'),
      ])

      const postCounts: Record<string, number> = {}
      const commentCounts: Record<string, number> = {}

      postsRes.data?.forEach((p: any) => {
        postCounts[p.author_id] = (postCounts[p.author_id] || 0) + 1
      })
      commentsRes.data?.forEach((c: any) => {
        commentCounts[c.author_id] = (commentCounts[c.author_id] || 0) + 1
      })

      const withPoints = profiles.map(p => ({
        ...p,
        points: (postCounts[p.id] || 0) * 5 + (commentCounts[p.id] || 0) * 2,
      }))
      setAllUsers(withPoints)
    }

    setLoading(false)
  }

  function getLevelPercent(level: number) {
    const total = allUsers.length
    if (total === 0) return 0
    const count = allUsers.filter(u => (u.level || 0) === level).length
    return Math.round((count / total) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  const userLevel = currentUser?.level || 0
  const levelInfo = getLevelInfo(userLevel)
  const nextLevel = LEVELS[userLevel + 1]
  const userPoints = allUsers.find(u => u.id === currentUser?.id)?.points ?? 0
  const userRank = [...allUsers].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).findIndex(u => u.id === currentUser?.id) + 1

  const topByPoints = [...allUsers].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 20)

  return (
    <div className="space-y-5">
      {/* Card do usuário */}
      {currentUser && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex gap-8 items-start flex-wrap">
            {/* Perfil */}
            <div className="flex flex-col items-center gap-3 min-w-[160px]">
              <div className="relative">
                <button
                  onClick={() => setProfileModalId(currentUser.id)}
                  className="block"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4"
                    style={{ borderColor: levelInfo.color }}>
                    <Avatar name={currentUser.full_name || 'Membro'} src={currentUser.avatar_url} size="lg" />
                  </div>
                </button>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-white"
                  style={{ background: levelInfo.color, color: levelInfo.textColor }}>
                  {userLevel}
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-zinc-900 text-sm">{currentUser.full_name}</p>
                <div className="mt-1 px-2 py-0.5 rounded-full text-xs font-semibold inline-block"
                  style={{ background: levelInfo.color + '20', color: levelInfo.color === '#e4e4e7' ? '#71717a' : levelInfo.color }}>
                  {levelInfo.faixa}
                </div>
                {nextLevel && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium transition"
                  >
                    <TrendingUp size={12} />
                    {pendingSubmission ? 'Ver submissão pendente' : `Subir para ${nextLevel.faixa}`}
                  </button>
                )}
              </div>
            </div>

            {/* Stats + Grade */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Points card */}
              <div className="flex items-center gap-4 bg-orange-50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-500 leading-tight">{userPoints} pts</p>
                  <p className="text-xs text-zinc-500">
                    {userRank > 0 ? `#${userRank} no ranking de pontos` : 'Participe para aparecer no ranking!'}
                  </p>
                </div>
              </div>

              {/* Grade de níveis */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                {LEVELS.map((l) => {
                  const unlocked = userLevel >= l.level
                  const percent = getLevelPercent(l.level)
                  return (
                    <div key={l.level} className="flex items-center gap-2.5">
                      {unlocked ? (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2"
                          style={{ background: l.color, color: l.textColor, borderColor: l.color }}>
                          {l.level}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 border-2 border-zinc-200">
                          <Lock size={11} className="text-zinc-400" />
                        </div>
                      )}
                      <div>
                        <p className={`text-xs font-medium leading-tight ${unlocked ? 'text-zinc-800' : 'text-zinc-400'}`}>
                          {l.faixa}
                        </p>
                        <p className="text-[11px] text-zinc-400">{percent}% dos membros</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-zinc-400 italic">
        Atualizado em: {updatedAt.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })} {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-zinc-200 p-1">
        <button
          onClick={() => setActiveTab('nivel')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'nivel' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Trophy size={14} />
          Ranking por Nível
        </button>
        <button
          onClick={() => setActiveTab('pontos')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'pontos' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Zap size={14} />
          Ranking por Pontos
        </button>
      </div>

      {/* Ranking por nível */}
      {activeTab === 'nivel' && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Ranking por nível</h3>
          <div className="space-y-2">
            {[...LEVELS].reverse().map((l) => {
              const usersInLevel = allUsers.filter(u => (u.level || 0) === l.level)
              if (usersInLevel.length === 0) return null
              return (
                <div key={l.level} className="flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: l.color, color: l.textColor }}>
                    {l.level}
                  </div>
                  <span className="text-xs font-semibold text-zinc-700 w-40 flex-shrink-0">{l.faixa}</span>
                  <div className="flex -space-x-2 flex-1">
                    {usersInLevel.slice(0, 8).map(u => (
                      <button key={u.id} onClick={() => setProfileModalId(u.id)}>
                        <Avatar name={u.full_name || 'M'} src={u.avatar_url} size="sm" />
                      </button>
                    ))}
                    {usersInLevel.length > 8 && (
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-500 border-2 border-white">
                        +{usersInLevel.length - 8}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400">{usersInLevel.length} membro{usersInLevel.length !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ranking por pontos */}
      {activeTab === 'pontos' && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">Ranking por pontos</h3>
          <p className="text-xs text-zinc-400 mb-4">Publicações (+5 pts) · Comentários (+2 pts)</p>
          <div className="space-y-2">
            {topByPoints.map((u, i) => {
              const lvl = getLevelInfo(u.level || 0)
              const isMe = u.id === currentUser?.id
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition ${isMe ? 'bg-orange-50' : 'hover:bg-zinc-50'}`}
                >
                  <span className="w-6 text-center text-sm font-bold text-zinc-400 flex-shrink-0">
                    {MEDALS[i] ?? <span className="text-xs">{i + 1}</span>}
                  </span>
                  <button onClick={() => setProfileModalId(u.id)}>
                    <Avatar name={u.full_name || 'M'} src={u.avatar_url} size="sm" level={u.level} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      className="text-sm font-medium text-zinc-800 truncate block text-left hover:text-orange-500 transition"
                      onClick={() => setProfileModalId(u.id)}
                    >
                      {u.full_name || 'Membro'}
                      {isMe && <span className="ml-1.5 text-[10px] font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-full">Você</span>}
                    </button>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: lvl.color + '20', color: lvl.color === '#e4e4e7' ? '#71717a' : lvl.color }}>
                      {lvl.faixa}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500 font-bold text-sm flex-shrink-0">
                    <Zap size={12} />
                    {u.points ?? 0}
                  </div>
                </div>
              )
            })}
            {topByPoints.length === 0 && (
              <p className="text-center text-zinc-400 text-sm py-6">Nenhum membro ainda</p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <SubmitLevelModal
          currentLevel={userLevel}
          pendingSubmission={pendingSubmission}
          onClose={() => setShowModal(false)}
          onSubmitted={loadData}
        />
      )}
      {profileModalId && (
        <MemberProfileModal memberId={profileModalId} onClose={() => setProfileModalId(null)} />
      )}
    </div>
  )
}
