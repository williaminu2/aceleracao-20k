'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, X, Search, FileText, AlertCircle, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Client { id: string; name: string }
interface Proposal {
  id: string
  number: number
  title: string
  client_id: string | null
  client_name: string | null
  status: string
  value: number
  valid_until: string | null
  follow_up_date: string | null
  notes: string | null
  created_at: string
}

type Status = 'sent' | 'approved' | 'pending' | 'rejected'

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  sent:     { label: 'Enviado',       color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500' },
  approved: { label: 'Aprovado',      color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  pending:  { label: 'Em espera',     color: 'text-orange-700',bg: 'bg-orange-50 border-orange-200',dot: 'bg-orange-500' },
  rejected: { label: 'Não aprovado',  color: 'text-red-700',   bg: 'bg-red-50 border-red-200',     dot: 'bg-red-500' },
}

const EMPTY_FORM = {
  title: '', client_id: '', value: '', valid_until: '', follow_up_date: '', notes: '', status: 'sent' as Status,
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

// Donut chart simples com conic-gradient
function DonutChart({ approved, pending, rejected }: { approved: number; pending: number; rejected: number }) {
  const total = approved + pending + rejected
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-44 h-44">
        <div className="w-44 h-44 rounded-full bg-zinc-100 flex items-center justify-center">
          <span className="text-xs text-zinc-400">Sem dados</span>
        </div>
      </div>
    )
  }
  const a = (approved / total) * 360
  const p = (pending / total) * 360
  const gradient = `conic-gradient(#22c55e 0deg ${a}deg, #f97316 ${a}deg ${a + p}deg, #ef4444 ${a + p}deg 360deg)`

  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <div className="w-full h-full rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-8 rounded-full bg-white" />
      {/* Labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-zinc-900">{total}</span>
        <span className="text-[10px] text-zinc-400">propostas</span>
      </div>
      {/* Numbers on chart */}
      {approved > 0 && <span className="absolute top-3 right-6 text-xs font-bold text-white drop-shadow">{approved}</span>}
      {pending > 0 && <span className="absolute top-3 left-6 text-xs font-bold text-white drop-shadow">{pending}</span>}
      {rejected > 0 && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white drop-shadow">{rejected}</span>}
    </div>
  )
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseValue(s: string) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

export default function PropostasPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      loadAll(user.id)
    })
  }, [])

  async function loadAll(uid: string) {
    setLoading(true)
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('proposals').select('*').eq('user_id', uid).order('number', { ascending: false }),
      supabase.from('clients').select('id, name').eq('user_id', uid).order('name'),
    ])
    if (p) setProposals(p)
    if (c) setClients(c)
    setLoading(false)
  }

  const stats = useMemo(() => {
    const sent     = proposals.filter(p => p.status === 'sent')
    const approved = proposals.filter(p => p.status === 'approved')
    const pending  = proposals.filter(p => p.status === 'pending')
    const rejected = proposals.filter(p => p.status === 'rejected')
    return {
      sentCount: proposals.length,     sentValue: proposals.reduce((s, p) => s + Number(p.value), 0),
      approvedCount: approved.length,  approvedValue: approved.reduce((s, p) => s + Number(p.value), 0),
      pendingCount: pending.length,    pendingValue: pending.reduce((s, p) => s + Number(p.value), 0),
      rejectedCount: rejected.length,  rejectedValue: rejected.reduce((s, p) => s + Number(p.value), 0),
    }
  }, [proposals])

  const today = new Date().toISOString().split('T')[0]
  const lateFollowUps = proposals.filter(p => p.follow_up_date && p.follow_up_date < today && p.status === 'sent')

  const filtered = proposals.filter(p => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.number).includes(search)
    return matchStatus && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(p: Proposal) {
    setEditing(p)
    setForm({
      title: p.title, client_id: p.client_id || '',
      value: p.value ? String(Number(p.value).toFixed(2)).replace('.', ',') : '',
      valid_until: p.valid_until || '', follow_up_date: p.follow_up_date || '',
      notes: p.notes || '', status: p.status as Status,
    })
    setShowModal(true)
  }

  function setF(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.title.trim() || saving || !userId) return
    setSaving(true)

    const client = clients.find(c => c.id === form.client_id)
    const payload = {
      title: form.title.trim(),
      client_id: form.client_id || null,
      client_name: client?.name || null,
      value: parseValue(form.value),
      status: form.status,
      valid_until: form.valid_until || null,
      follow_up_date: form.follow_up_date || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (editing) {
      await supabase.from('proposals').update(payload).eq('id', editing.id)
    } else {
      const nextNumber = proposals.length > 0 ? Math.max(...proposals.map(p => p.number)) + 1 : 1
      await supabase.from('proposals').insert({ ...payload, user_id: userId, number: nextNumber })
    }

    setShowModal(false)
    await loadAll(userId)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta proposta?') || !userId) return
    setDeleting(id)
    await supabase.from('proposals').delete().eq('id', id)
    await loadAll(userId)
    setDeleting(null)
  }

  async function handleStatusChange(id: string, status: Status) {
    if (!userId) return
    setStatusLoading(id)
    await supabase.from('proposals').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await loadAll(userId)
    setStatusLoading(null)
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-zinc-900 text-lg">Propostas</h1>
        </div>
        <button
          onClick={() => router.push('/escritorio/propostas/nova')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} /> Nova Proposta
        </button>
      </div>

      {/* Stats + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {[
            { label: 'Enviado', count: stats.sentCount, value: stats.sentValue, color: 'text-blue-600' },
            { label: 'Aprovado', count: stats.approvedCount, value: stats.approvedValue, color: 'text-green-600' },
            { label: 'Em espera', count: stats.pendingCount, value: stats.pendingValue, color: 'text-orange-500' },
            { label: 'Não aprovado', count: stats.rejectedCount, value: stats.rejectedValue, color: 'text-red-500' },
          ].map(({ label, count, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500 font-medium mb-1">{label} ({count})</p>
              <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
            </div>
          ))}

          {/* Follow-up atrasado */}
          {lateFollowUps.length > 0 && (
            <div className="col-span-2 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">Follow-up atrasado</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Você tem {lateFollowUps.length} proposta{lateFollowUps.length > 1 ? 's' : ''} com follow-up atrasado:{' '}
                  {lateFollowUps.slice(0, 3).map(p => p.title).join(', ')}
                  {lateFollowUps.length > 3 && ` e mais ${lateFollowUps.length - 3}...`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Donut */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col items-center justify-center gap-4">
          <DonutChart
            approved={stats.approvedCount}
            pending={stats.pendingCount}
            rejected={stats.rejectedCount}
          />
          <div className="flex flex-col gap-1.5 w-full">
            {[
              { label: 'Aprovado', color: 'bg-green-500', count: stats.approvedCount },
              { label: 'Em espera', color: 'bg-orange-500', count: stats.pendingCount },
              { label: 'Não aprovado', color: 'bg-red-500', count: stats.rejectedCount },
            ].map(({ label, color, count }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-zinc-600">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                {label} <span className="ml-auto font-semibold text-zinc-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Pesquisar proposta, cliente ou número..."
            className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition"
        >
          <option value="all">Todos</option>
          <option value="sent">Enviado</option>
          <option value="approved">Aprovado</option>
          <option value="pending">Em espera</option>
          <option value="rejected">Não aprovado</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <FileText size={32} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">Nenhuma proposta encontrada</p>
          {!search && filterStatus === 'all' && (
            <button onClick={openNew} className="mt-3 text-sm text-blue-600 font-semibold hover:underline">Criar primeira proposta</button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide w-12">Núm.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Empreendimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Vencimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, i) => {
                  const cfg = STATUS_CONFIG[p.status as Status] || STATUS_CONFIG.sent
                  const isLate = p.follow_up_date && p.follow_up_date < today && p.status === 'sent'
                  return (
                    <tr key={p.id} className={`${i < paginated.length - 1 ? 'border-b border-zinc-100' : ''} hover:bg-zinc-50 transition`}>
                      <td className="px-4 py-3.5 text-zinc-500 font-mono text-xs">{p.number}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 truncate max-w-[200px]">{p.title}</span>
                          {isLate && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Follow-up atrasado" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 truncate max-w-[140px]">{p.client_name || '—'}</td>
                      <td className="px-4 py-3.5 text-zinc-500 text-xs">
                        {p.valid_until ? new Date(p.valid_until + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-zinc-900">{fmt(Number(p.value))}</td>
                      <td className="px-4 py-3.5">
                        <div className="relative inline-block">
                          <select
                            value={p.status}
                            onChange={e => handleStatusChange(p.id, e.target.value as Status)}
                            disabled={statusLoading === p.id}
                            className={`text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full border appearance-none cursor-pointer outline-none ${cfg.bg} ${cfg.color}`}
                          >
                            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          {statusLoading === p.id
                            ? <Loader2 size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />
                            : <ChevronDown size={10} className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${cfg.color}`} />
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                            {deleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 flex-wrap">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 disabled:opacity-40 transition">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 disabled:opacity-40 transition">‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const n = page <= 4 ? i + 1 : page + i - 3
                if (n < 1 || n > totalPages) return null
                return (
                  <button key={n} onClick={() => setPage(n)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${n === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>
                    {n}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 disabled:opacity-40 transition">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 disabled:opacity-40 transition">»</button>
            </div>
          )}
        </>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-zinc-900">{editing ? 'Editar proposta' : 'Nova proposta'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Nome do Empreendimento *">
                <input autoFocus value={form.title} onChange={e => setF('title', e.target.value)} className={inputCls} placeholder="Ex: Casa João Silva" />
              </Field>
              <Field label="Cliente">
                <select value={form.client_id} onChange={e => setF('client_id', e.target.value)} className={inputCls}>
                  <option value="">— Selecionar cliente —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor (R$)">
                  <input
                    value={form.value}
                    onChange={e => setF('value', e.target.value)}
                    className={inputCls}
                    placeholder="0,00"
                  />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => setF('status', e.target.value)} className={inputCls}>
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vencimento">
                  <input type="date" value={form.valid_until} onChange={e => setF('valid_until', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Data de Follow-up">
                  <input type="date" value={form.follow_up_date} onChange={e => setF('follow_up_date', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Observações">
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Notas sobre a proposta..." />
              </Field>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
              <button onClick={handleSave} disabled={!form.title.trim() || saving} className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editing ? 'Salvar' : 'Criar Proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
