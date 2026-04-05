'use client'

import { useEffect, useState } from 'react'
import { Lock, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { LEVELS, getLevelInfo } from '@/lib/levels'
import { SubmitLevelModal } from './SubmitLevelModal'

interface RankedUser {
  id: string
  full_name: string
  avatar_url: string | null
  level: number
}

export function Leaderboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<RankedUser[]>([])
  const [pendingSubmission, setPendingSubmission] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [updatedAt] = useState(new Date())
  const [loading, setLoading] = useState(true)

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
    if (profiles) setAllUsers(profiles)

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

  return (
    <div className="space-y-5">
      {/* Card do usuário */}
      {currentUser && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex gap-8 items-start flex-wrap">
            {/* Perfil */}
            <div className="flex flex-col items-center gap-3 min-w-[160px]">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4"
                  style={{ borderColor: levelInfo.color }}>
                  <Avatar name={currentUser.full_name || 'Membro'} src={currentUser.avatar_url} size="lg" />
                </div>
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

            {/* Grade de níveis */}
            <div className="flex-1 min-w-0">
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

      {/* Ranking por nível */}
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
                    <Avatar key={u.id} name={u.full_name || 'M'} src={u.avatar_url} size="sm" />
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

      {/* Modal */}
      {showModal && (
        <SubmitLevelModal
          currentLevel={userLevel}
          pendingSubmission={pendingSubmission}
          onClose={() => setShowModal(false)}
          onSubmitted={loadData}
        />
      )}
    </div>
  )
}
