'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, XCircle, Clock, ExternalLink, ArrowLeft,
  Hash, Megaphone, UserCircle, Link2, Bot, HelpCircle,
  Zap, BarChart2, Trophy, Briefcase, Cpu, AlertCircle,
  Trash2, Plus, Users, Radio, FileText, TrendingUp, Loader2, ShieldCheck, ShieldOff, Pencil, BookOpen,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { getLevelInfo, LEVELS as LEVELS_LIST } from '@/lib/levels'
import { CursosSection } from '@/components/admin/CursosSection'
import { logAction } from '@/lib/adminLog'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Submission {
  id: string
  user_id: string
  target_level: number
  amount_received: number | null
  amount_contracted: number | null
  proof_description: string
  proof_url: string | null
  status: string
  admin_notes: string | null
  created_at: string
  profiles: { full_name: string; avatar_url: string | null; level: number }
}

interface Channel {
  id: string
  label: string
  icon: string
  order_index: number
  admin_only: boolean
}

interface Post {
  id: string
  content: string
  channel: string
  created_at: string
  pinned: boolean
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Member {
  id: string
  full_name: string
  avatar_url: string | null
  level: number
  role: string
  status: string
  created_at: string
  email?: string
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, any> = {
  Hash, Megaphone, UserCircle, Link2, Bot, HelpCircle,
  Zap, BarChart2, Trophy, Briefcase, Cpu, AlertCircle,
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Section = 'niveis' | 'usuarios' | 'canais' | 'postagens' | 'cursos' | 'logs'

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [section, setSection] = useState<Section>('niveis')

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') { router.push('/comunidade'); return }
    setIsAdmin(true)
  }

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )

  const NAV: { key: Section; label: string; icon: any }[] = [
    { key: 'niveis', label: 'Aprovação de Níveis', icon: TrendingUp },
    { key: 'usuarios', label: 'Usuários', icon: Users },
    { key: 'canais', label: 'Canais', icon: Radio },
    { key: 'postagens', label: 'Postagens', icon: FileText },
    { key: 'cursos', label: 'Cursos', icon: BookOpen },
    { key: 'logs', label: 'Logs de Admin', icon: BarChart2 },
  ]

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/comunidade')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="font-bold text-zinc-900">Painel Admin</h1>
      </div>

      <div className="max-w-5xl mx-auto py-6 px-4 flex gap-5">
        {/* Left nav */}
        <aside className="w-48 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSection(key)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b border-zinc-100 last:border-0 transition ${
                  section === key ? 'bg-orange-500 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {section === 'niveis' && <NiveisSection />}
          {section === 'usuarios' && <UsuariosSection />}
          {section === 'canais' && <CanaisSection />}
          {section === 'postagens' && <PostagensSection />}
          {section === 'cursos' && <CursosSection />}
          {section === 'logs' && <LogsSection />}
        </div>
      </div>
    </div>
  )
}

// ─── Seção: Níveis ────────────────────────────────────────────────────────────

function NiveisSection() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('level_submissions')
      .select(`*, profiles (full_name, avatar_url, level)`)
      .order('created_at', { ascending: false })
    if (data) setSubmissions(data as any)
    setLoading(false)
  }

  async function handleReview(s: Submission, approved: boolean) {
    setProcessing(s.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('level_submissions').update({
      status: approved ? 'approved' : 'rejected',
      admin_notes: notes[s.id] || null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', s.id)
    if (approved) {
      await supabase.from('profiles').update({ level: s.target_level }).eq('id', s.user_id)
    }
    await logAction({
      action: approved ? 'Aprovação de nível' : 'Rejeição de nível',
      targetType: 'nivel',
      targetId: s.user_id,
      targetName: s.profiles?.full_name,
      details: {
        faixa: getLevelInfo(s.target_level).faixa,
        valor_recebido: s.amount_received,
        valor_contratado: s.amount_contracted,
        observacao: notes[s.id] || null,
      },
    })
    await load()
    setProcessing(null)
  }

  const filtered = submissions.filter(s => filter === 'all' ? true : s.status === filter)
  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-bold text-zinc-900">Aprovação de Níveis</h2>
        {pendingCount > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'pending', label: 'Pendentes' },
          { key: 'approved', label: 'Aprovadas' },
          { key: 'rejected', label: 'Rejeitadas' },
          { key: 'all', label: 'Todas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              filter === f.key ? 'bg-orange-500 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-zinc-400">Nenhuma submissão encontrada</div>
      ) : filtered.map((s) => {
        const targetLevel = getLevelInfo(s.target_level)
        const currentLevel = getLevelInfo(s.profiles?.level || 0)
        return (
          <div key={s.id} className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={s.profiles?.full_name || 'Membro'} src={s.profiles?.avatar_url} size="md" />
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">{s.profiles?.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: currentLevel.color + '20', color: currentLevel.color === '#e4e4e7' ? '#71717a' : currentLevel.color }}>
                      {currentLevel.faixa}
                    </span>
                    <span className="text-zinc-400 text-xs">→</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: targetLevel.color + '20', color: targetLevel.color === '#e4e4e7' ? '#71717a' : targetLevel.color }}>
                      {targetLevel.faixa}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.status === 'pending' && <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full"><Clock size={11} /> Pendente</span>}
                {s.status === 'approved' && <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full"><CheckCircle size={11} /> Aprovada</span>}
                {s.status === 'rejected' && <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full"><XCircle size={11} /> Rejeitada</span>}
                <span className="text-xs text-zinc-400">{new Date(s.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {(s.amount_received || s.amount_contracted) && (
              <div className="flex gap-4 p-3 bg-zinc-50 rounded-lg">
                {s.amount_received && (
                  <div>
                    <p className="text-xs text-zinc-500">Valor Recebido</p>
                    <p className="text-sm font-bold text-zinc-900">R$ {Number(s.amount_received).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {s.amount_contracted && (
                  <div>
                    <p className="text-xs text-zinc-500">Valor Contratado</p>
                    <p className="text-sm font-bold text-zinc-900">R$ {Number(s.amount_contracted).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">Descrição</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{s.proof_description}</p>
            </div>

            {s.proof_url && (
              <a href={s.proof_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium transition">
                <ExternalLink size={14} /> Ver comprovante
              </a>
            )}

            {s.status === 'pending' && (
              <div className="space-y-3 pt-3 border-t border-zinc-100">
                <textarea
                  value={notes[s.id] || ''}
                  onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                  placeholder="Observação para o membro (opcional)..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleReview(s, false)} disabled={processing === s.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl transition">
                    <XCircle size={15} /> Rejeitar
                  </button>
                  <button onClick={() => handleReview(s, true)} disabled={processing === s.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-xl transition">
                    <CheckCircle size={15} /> Aprovar
                  </button>
                </div>
              </div>
            )}

            {s.admin_notes && s.status !== 'pending' && (
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-xs font-semibold text-zinc-500 mb-1">Observação do admin</p>
                <p className="text-sm text-zinc-700">{s.admin_notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Seção: Usuários ──────────────────────────────────────────────────────────

function UsuariosSection() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [levelPickerId, setLevelPickerId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, level, role, status, created_at')
      .order('created_at', { ascending: false })
    if (data) setMembers(data as any)
    setLoading(false)
  }

  async function removeUser(id: string) {
    const member = members.find(m => m.id === id)
    if (!confirm('Remover este usuário? Ele perderá acesso à plataforma.')) return
    setProcessing(id)
    await supabase.from('profiles').update({ status: 'banned' }).eq('id', id)
    await logAction({ action: 'Usuário removido', targetType: 'usuario', targetId: id, targetName: member?.full_name })
    await load()
    setProcessing(null)
  }

  async function reactivate(id: string) {
    const member = members.find(m => m.id === id)
    setProcessing(id)
    await supabase.from('profiles').update({ status: 'active' }).eq('id', id)
    await logAction({ action: 'Usuário reativado', targetType: 'usuario', targetId: id, targetName: member?.full_name })
    await load()
    setProcessing(null)
  }

  async function approveUser(id: string) {
    const member = members.find(m => m.id === id)
    setProcessing(id)
    await supabase.from('profiles').update({ status: 'active' }).eq('id', id)
    await logAction({ action: 'Usuário aprovado', targetType: 'usuario', targetId: id, targetName: member?.full_name })
    await load()
    setProcessing(null)
  }

  async function setRole(id: string, role: string) {
    const member = members.find(m => m.id === id)
    setProcessing(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    await logAction({
      action: role === 'admin' ? 'Usuário promovido a admin' : 'Admin rebaixado a membro',
      targetType: 'usuario', targetId: id, targetName: member?.full_name,
    })
    await load()
    setProcessing(null)
  }

  async function setLevel(id: string, level: number) {
    const member = members.find(m => m.id === id)
    setProcessing(id)
    await supabase.from('profiles').update({ level }).eq('id', id)
    await logAction({
      action: 'Faixa alterada manualmente',
      targetType: 'usuario', targetId: id, targetName: member?.full_name,
      details: { faixa_anterior: getLevelInfo(member?.level || 0).faixa, nova_faixa: getLevelInfo(level).faixa },
    })
    setLevelPickerId(null)
    await load()
    setProcessing(null)
  }

  const filtered = members.filter(m =>
    filter === 'all' ? true :
    filter === 'pending' ? (m.status === 'pending' || !m.status) :
    filter === 'removed' ? m.status === 'banned' :
    m.status === filter
  )

  const pendingCount = members.filter(m => m.status === 'pending' || !m.status).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-bold text-zinc-900">Usuários</h2>
        {pendingCount > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount} aguardando aprovação
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'pending', label: 'Pendentes' },
          { key: 'active', label: 'Ativos' },
          { key: 'removed', label: 'Removidos' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              filter === f.key ? 'bg-orange-500 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-zinc-400 py-10">Nenhum usuário encontrado</p>
          ) : filtered.map((m, i) => {
            const levelInfo = getLevelInfo(m.level || 0)
            const isPending = !m.status || m.status === 'pending'
            const isRemoved = m.status === 'banned'
            const isActive = m.status === 'active'
            const showLevelPicker = levelPickerId === m.id
            return (
              <div key={m.id} className={`px-5 py-3.5 ${i < filtered.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                <div className="flex items-center gap-4">
                  <Avatar name={m.full_name || 'Membro'} src={m.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{m.full_name || 'Sem nome'}</p>
                      {m.role === 'admin' && (
                        <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded-full font-bold">Admin</span>
                      )}
                      {/* Faixa clicável */}
                      <button
                        onClick={() => setLevelPickerId(showLevelPicker ? null : m.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-transparent hover:border-current transition"
                        style={{ background: levelInfo.color + '20', color: levelInfo.color === '#e4e4e7' ? '#71717a' : levelInfo.color }}
                        title="Clique para alterar a faixa"
                      >
                        {levelInfo.faixa} ✎
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Entrou em {new Date(m.created_at).toLocaleDateString('pt-BR')}
                      {' · '}
                      {isRemoved ? <span className="text-red-500 font-medium">Removido</span>
                        : isPending ? <span className="text-yellow-600 font-medium">Aguardando aprovação</span>
                        : <span className="text-green-600 font-medium">Ativo</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {processing === m.id ? (
                      <Loader2 size={16} className="animate-spin text-zinc-400" />
                    ) : (
                      <>
                        {isPending && (
                          <button onClick={() => approveUser(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition">
                            <CheckCircle size={12} /> Aprovar
                          </button>
                        )}
                        {isActive && (
                          <button onClick={() => removeUser(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition">
                            <Trash2 size={12} /> Remover
                          </button>
                        )}
                        {isRemoved && (
                          <button onClick={() => reactivate(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition">
                            <ShieldCheck size={12} /> Reativar
                          </button>
                        )}
                        {m.role !== 'admin' && isActive && (
                          <button onClick={() => setRole(m.id, 'admin')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition">
                            <ShieldCheck size={12} /> Tornar Admin
                          </button>
                        )}
                        {m.role === 'admin' && (
                          <button onClick={() => setRole(m.id, 'member')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition">
                            <ShieldOff size={12} /> Remover Admin
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Seletor de faixa inline */}
                {showLevelPicker && (
                  <div className="mt-3 ml-14 flex flex-wrap gap-2">
                    {LEVELS_LIST.map(l => (
                      <button
                        key={l.level}
                        onClick={() => setLevel(m.id, l.level)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${
                          (m.level || 0) === l.level ? 'border-current' : 'border-transparent hover:border-current'
                        }`}
                        style={{ background: l.color + '15', color: l.color === '#e4e4e7' ? '#71717a' : l.color }}
                      >
                        {(m.level || 0) === l.level && <CheckCircle size={11} />}
                        {l.faixa}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Seção: Canais ────────────────────────────────────────────────────────────

function CanaisSection() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('Hash')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon] = useState('Hash')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('channels').select('*').order('order_index')
    if (data) setChannels(data)
    setLoading(false)
  }

  async function handleCreate() {
    if (!newLabel.trim() || saving) return
    setSaving(true)
    const maxOrder = channels.length > 0 ? Math.max(...channels.map(c => c.order_index)) + 1 : 1
    await supabase.from('channels').insert({ label: newLabel.trim(), icon: newIcon, order_index: maxOrder })
    await logAction({ action: 'Canal criado', targetType: 'canal', targetName: newLabel.trim() })
    setNewLabel('')
    setNewIcon('Hash')
    await load()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const channel = channels.find(c => c.id === id)
    if (!confirm('Remover este canal? As postagens do canal não serão excluídas.')) return
    setDeleting(id)
    await supabase.from('channels').delete().eq('id', id)
    await logAction({ action: 'Canal removido', targetType: 'canal', targetId: id, targetName: channel?.label })
    await load()
    setDeleting(null)
  }

  function startEdit(c: Channel) {
    setEditing(c.id)
    setEditLabel(c.label)
    setEditIcon(c.icon)
  }

  async function handleSaveEdit(id: string) {
    const channel = channels.find(c => c.id === id)
    if (!editLabel.trim()) return
    setEditSaving(true)
    await supabase.from('channels').update({ label: editLabel.trim(), icon: editIcon }).eq('id', id)
    await logAction({
      action: 'Canal editado', targetType: 'canal', targetId: id,
      details: { nome_anterior: channel?.label, novo_nome: editLabel.trim() },
    })
    setEditing(null)
    await load()
    setEditSaving(false)
  }

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-zinc-900">Canais</h2>

      {/* Criar canal */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-700">Novo canal</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nome do canal"
            className="flex-1 px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
          <button onClick={handleCreate} disabled={!newLabel.trim() || saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar
          </button>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2">Ícone</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ICON_MAP).map(([name, Icon]) => (
              <button key={name} onClick={() => setNewIcon(name)}
                className={`p-2 rounded-lg transition ${newIcon === name ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de canais */}
      {loading ? (
        <div className="flex justify-center py-10"><span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {channels.length === 0 ? (
            <p className="text-center text-zinc-400 py-8">Nenhum canal criado</p>
          ) : channels.map((c, i) => {
            const Icon = ICON_MAP[c.icon] || Hash
            const isEditing = editing === c.id
            const EditIcon = ICON_MAP[editIcon] || Hash
            return (
              <div key={c.id} className={`px-5 py-3.5 ${i < channels.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <EditIcon size={15} className="text-orange-500" />
                      </div>
                      <input
                        autoFocus
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(c.id)}
                        className="flex-1 px-3 py-1.5 text-sm border border-orange-400 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 transition"
                      />
                      <button onClick={() => handleSaveEdit(c.id)} disabled={editSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition">
                        {editSaving ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="px-3 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition">
                        Cancelar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      {Object.entries(ICON_MAP).map(([name, IIcon]) => (
                        <button key={name} onClick={() => setEditIcon(name)}
                          className={`p-1.5 rounded-lg transition ${editIcon === name ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                          <IIcon size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-orange-500" />
                    </div>
                    <p className="flex-1 text-sm font-medium text-zinc-900">{c.label}</p>
                    {/* Toggle: somente admin pode postar */}
                    <button
                      onClick={async () => {
                        await supabase.from('channels').update({ admin_only: !c.admin_only }).eq('id', c.id)
                        await logAction({
                          action: c.admin_only ? 'Canal liberado para todos' : 'Canal restrito a admins',
                          targetType: 'canal', targetId: c.id, targetName: c.label,
                        })
                        await load()
                      }}
                      title={c.admin_only ? 'Somente admins podem postar — clique para liberar' : 'Qualquer membro pode postar — clique para restringir'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        c.admin_only
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <ShieldCheck size={11} />
                      {c.admin_only ? 'Só admins' : 'Todos'}
                    </button>
                    <button onClick={() => startEdit(c)}
                      className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      {deleting === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Seção: Postagens ─────────────────────────────────────────────────────────

function PostagensSection() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('id, content, channel, created_at, pinned, profiles (full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setPosts(data as any)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const post = posts.find(p => p.id === id)
    if (!confirm('Excluir esta postagem permanentemente?')) return
    setDeleting(id)
    await supabase.from('posts').delete().eq('id', id)
    await logAction({
      action: 'Postagem excluída', targetType: 'postagem', targetId: id,
      details: { autor: post?.profiles?.full_name, canal: post?.channel, trecho: post?.content?.slice(0, 80) },
    })
    await load()
    setDeleting(null)
  }

  async function togglePin(post: Post) {
    await supabase.from('posts').update({ pinned: !post.pinned }).eq('id', post.id)
    await logAction({
      action: post.pinned ? 'Postagem desafixada' : 'Postagem fixada',
      targetType: 'postagem', targetId: post.id,
      details: { canal: post.channel, trecho: post.content?.slice(0, 80) },
    })
    await load()
  }

  const filtered = posts.filter(p =>
    search ? p.content.toLowerCase().includes(search.toLowerCase()) || (p.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) : true
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-zinc-900">Postagens</h2>
        <span className="text-xs text-zinc-400">{posts.length} postagens</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por conteúdo ou autor..."
        className="w-full px-3 py-2.5 text-sm border border-zinc-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
      />

      {loading ? (
        <div className="flex justify-center py-16"><span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-zinc-400 py-10">Nenhuma postagem encontrada</p>
          ) : filtered.map((p, i) => (
            <div key={p.id} className={`flex gap-3 px-5 py-4 ${i < filtered.length - 1 ? 'border-b border-zinc-100' : ''}`}>
              <Avatar name={p.profiles?.full_name || 'Membro'} src={p.profiles?.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-zinc-700">{p.profiles?.full_name || 'Membro'}</p>
                  <span className="text-xs text-zinc-400">·</span>
                  <span className="text-xs text-orange-500 font-medium">{p.channel}</span>
                  <span className="text-xs text-zinc-400">·</span>
                  <span className="text-xs text-zinc-400">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                  {p.pinned && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Fixado</span>}
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed line-clamp-2">{p.content}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => togglePin(p)}
                  title={p.pinned ? 'Desafixar' : 'Fixar postagem'}
                  className={`p-2 rounded-lg text-xs transition ${p.pinned ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' : 'text-zinc-400 hover:text-orange-500 hover:bg-orange-50'}`}>
                  📌
                </button>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  {deleting === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Seção: Logs de Admin ─────────────────────────────────────────────────────

interface AdminLog {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  target_name: string | null
  details: Record<string, any> | null
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  usuario: 'Usuário',
  canal: 'Canal',
  postagem: 'Postagem',
  curso: 'Curso',
  nivel: 'Nível',
}

const TARGET_TYPE_COLORS: Record<string, string> = {
  usuario: 'bg-blue-100 text-blue-700',
  canal: 'bg-purple-100 text-purple-700',
  postagem: 'bg-zinc-100 text-zinc-700',
  curso: 'bg-green-100 text-green-700',
  nivel: 'bg-orange-100 text-orange-700',
}

function LogsSection() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterAdmin, setFilterAdmin] = useState('all')
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('admin_logs')
      .select('*, profiles (full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(300)
    if (data) {
      setLogs(data as any)
      const seen = new Set<string>()
      const adminList: { id: string; full_name: string }[] = []
      for (const log of data as any[]) {
        if (log.admin_id && !seen.has(log.admin_id)) {
          seen.add(log.admin_id)
          adminList.push({ id: log.admin_id, full_name: log.profiles?.full_name || 'Admin' })
        }
      }
      setAdmins(adminList)
    }
    setLoading(false)
  }

  const filtered = logs.filter(l => {
    const typeOk = filterType === 'all' || l.target_type === filterType
    const adminOk = filterAdmin === 'all' || l.admin_id === filterAdmin
    return typeOk && adminOk
  })

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-zinc-900">Logs de Administrador</h2>
        <span className="text-xs text-zinc-400">{filtered.length} registros</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'usuario', label: 'Usuários' },
            { key: 'canal', label: 'Canais' },
            { key: 'postagem', label: 'Postagens' },
            { key: 'curso', label: 'Cursos' },
            { key: 'nivel', label: 'Níveis' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                filterType === f.key ? 'bg-orange-500 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        {admins.length > 1 && (
          <select
            value={filterAdmin}
            onChange={e => setFilterAdmin(e.target.value)}
            className="px-3 py-1.5 text-xs border border-zinc-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-orange-400 transition"
          >
            <option value="all">Todos os admins</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-zinc-400 text-sm">
          Nenhum log encontrado. As ações dos administradores aparecerão aqui.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {filtered.map((log, i) => (
            <div key={log.id} className={`px-5 py-4 ${i < filtered.length - 1 ? 'border-b border-zinc-100' : ''}`}>
              <div className="flex items-start gap-3">
                <Avatar name={log.profiles?.full_name || 'Admin'} src={log.profiles?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-zinc-900">
                      {log.profiles?.full_name || 'Admin'}
                    </span>
                    {log.target_type && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TARGET_TYPE_COLORS[log.target_type] || 'bg-zinc-100 text-zinc-600'}`}>
                        {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400 ml-auto">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-zinc-700 font-medium">{log.action}</p>
                  {log.target_name && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Alvo: <span className="font-medium text-zinc-700">{log.target_name}</span>
                    </p>
                  )}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(log.details).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
                        <span key={k} className="text-xs text-zinc-500">
                          <span className="font-medium text-zinc-600">{k.replace(/_/g, ' ')}:</span>{' '}
                          {typeof v === 'number' && k.startsWith('valor')
                            ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
