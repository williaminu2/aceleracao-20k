'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Loader2, X, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NicheService {
  id: string
  name: string
  unit: string
  default_price: number
}

interface Niche {
  id: string
  name: string
  services: NicheService[]
}

const UNITS = ['m²', 'm³', 'un', 'vb', 'hr', 'ml', 'kg', 'cx']

const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition bg-white'

export default function ConfiguracoesPage() {
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Niche form
  const [showNicheForm, setShowNicheForm] = useState(false)
  const [editingNiche, setEditingNiche] = useState<Niche | null>(null)
  const [nicheName, setNicheName] = useState('')
  const [savingNiche, setSavingNiche] = useState(false)
  const [deletingNiche, setDeletingNiche] = useState<string | null>(null)

  // Service form
  const [showServiceForm, setShowServiceForm] = useState<string | null>(null) // niche id
  const [editingService, setEditingService] = useState<NicheService | null>(null)
  const [serviceForm, setServiceForm] = useState({ name: '', unit: 'm²', default_price: '' })
  const [savingService, setSavingService] = useState(false)
  const [deletingService, setDeletingService] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      load(user.id)
    })
  }, [])

  async function load(uid: string) {
    setLoading(true)
    const { data: nicheData } = await supabase
      .from('niches').select('id, name').eq('user_id', uid).order('name')
    const { data: svcData } = await supabase
      .from('niche_services').select('id, niche_id, name, unit, default_price').eq('user_id', uid).order('name')

    if (nicheData) {
      setNiches(nicheData.map(n => ({
        ...n,
        services: (svcData || []).filter(s => s.niche_id === n.id),
      })))
    }
    setLoading(false)
  }

  // ── Niches ──────────────────────────────────────────────────────────────────

  function openNewNiche() { setEditingNiche(null); setNicheName(''); setShowNicheForm(true) }
  function openEditNiche(n: Niche) { setEditingNiche(n); setNicheName(n.name); setShowNicheForm(true) }

  async function saveNiche() {
    if (!nicheName.trim() || !userId || savingNiche) return
    setSavingNiche(true)
    if (editingNiche) {
      await supabase.from('niches').update({ name: nicheName.trim() }).eq('id', editingNiche.id)
    } else {
      await supabase.from('niches').insert({ user_id: userId, name: nicheName.trim() })
    }
    setShowNicheForm(false)
    await load(userId)
    setSavingNiche(false)
  }

  async function deleteNiche(id: string) {
    if (!confirm('Excluir este nicho e todos os seus serviços?') || !userId) return
    setDeletingNiche(id)
    await supabase.from('niche_services').delete().eq('niche_id', id)
    await supabase.from('niches').delete().eq('id', id)
    await load(userId)
    setDeletingNiche(null)
  }

  // ── Services ─────────────────────────────────────────────────────────────────

  function openNewService(nicheId: string) {
    setShowServiceForm(nicheId)
    setEditingService(null)
    setServiceForm({ name: '', unit: 'm²', default_price: '' })
    setExpandedId(nicheId)
  }

  function openEditService(nicheId: string, s: NicheService) {
    setShowServiceForm(nicheId)
    setEditingService(s)
    setServiceForm({ name: s.name, unit: s.unit, default_price: s.default_price ? String(s.default_price).replace('.', ',') : '' })
    setExpandedId(nicheId)
  }

  async function saveService() {
    if (!serviceForm.name.trim() || !showServiceForm || !userId || savingService) return
    setSavingService(true)
    const price = parseFloat(serviceForm.default_price.replace(',', '.')) || 0
    if (editingService) {
      await supabase.from('niche_services').update({
        name: serviceForm.name.trim(), unit: serviceForm.unit, default_price: price,
      }).eq('id', editingService.id)
    } else {
      await supabase.from('niche_services').insert({
        user_id: userId, niche_id: showServiceForm,
        name: serviceForm.name.trim(), unit: serviceForm.unit, default_price: price,
      })
    }
    setShowServiceForm(null)
    await load(userId)
    setSavingService(false)
  }

  async function deleteService(id: string) {
    if (!confirm('Excluir este serviço?') || !userId) return
    setDeletingService(id)
    await supabase.from('niche_services').delete().eq('id', id)
    await load(userId)
    setDeletingService(null)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Settings size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-zinc-900 text-lg">Nichos e Serviços</h1>
            <p className="text-xs text-zinc-500">Configure os nichos e serviços disponíveis nas propostas</p>
          </div>
        </div>
        <button onClick={openNewNiche}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={15} /> Novo Nicho
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : niches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <Settings size={32} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">Nenhum nicho cadastrado</p>
          <p className="text-zinc-400 text-xs mt-1">Crie nichos como "Projetos Estruturais", "Instalações Prediais"...</p>
          <button onClick={openNewNiche} className="mt-3 text-sm text-blue-600 font-semibold hover:underline">Criar primeiro nicho</button>
        </div>
      ) : (
        <div className="space-y-3">
          {niches.map(niche => {
            const expanded = expandedId === niche.id
            return (
              <div key={niche.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                {/* Niche header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button onClick={() => setExpandedId(expanded ? null : niche.id)}
                    className="flex items-center gap-3 flex-1 text-left">
                    {expanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                    <span className="font-semibold text-zinc-900">{niche.name}</span>
                    <span className="text-xs text-zinc-400">{niche.services.length} serviço{niche.services.length !== 1 ? 's' : ''}</span>
                  </button>
                  <button onClick={() => openNewService(niche.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                    <Plus size={12} /> Serviço
                  </button>
                  <button onClick={() => openEditNiche(niche)}
                    className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteNiche(niche.id)} disabled={deletingNiche === niche.id}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    {deletingNiche === niche.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>

                {/* Services */}
                {expanded && (
                  <div className="border-t border-zinc-100">
                    {/* Add/edit service form */}
                    {showServiceForm === niche.id && (
                      <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
                        <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wide">
                          {editingService ? 'Editar serviço' : 'Novo serviço'}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-3 sm:col-span-1">
                            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Nome do serviço *</label>
                            <input autoFocus value={serviceForm.name}
                              onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="Ex: Projeto Estrutural" className={inputCls}
                              onKeyDown={e => e.key === 'Enter' && saveService()} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Unidade</label>
                            <select value={serviceForm.unit}
                              onChange={e => setServiceForm(f => ({ ...f, unit: e.target.value }))}
                              className={inputCls}>
                              {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Valor padrão (R$)</label>
                            <input value={serviceForm.default_price}
                              onChange={e => setServiceForm(f => ({ ...f, default_price: e.target.value }))}
                              placeholder="0,00" className={inputCls} />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setShowServiceForm(null)}
                            className="px-4 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
                          <button onClick={saveService} disabled={!serviceForm.name.trim() || savingService}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-lg transition">
                            {savingService && <Loader2 size={11} className="animate-spin" />}
                            {editingService ? 'Salvar' : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Services list */}
                    {niche.services.length === 0 && showServiceForm !== niche.id ? (
                      <p className="text-sm text-zinc-400 px-5 py-4">Nenhum serviço cadastrado neste nicho.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-500">Serviço</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-500 w-20">Unidade</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-500 w-28">Valor padrão</th>
                            <th className="w-20" />
                          </tr>
                        </thead>
                        <tbody>
                          {niche.services.map((s, i) => (
                            <tr key={s.id} className={`${i < niche.services.length - 1 ? 'border-b border-zinc-100' : ''} hover:bg-zinc-50 transition`}>
                              <td className="px-5 py-3 font-medium text-zinc-800">{s.name}</td>
                              <td className="px-3 py-3 text-zinc-500">{s.unit}</td>
                              <td className="px-3 py-3 text-zinc-700">
                                {s.default_price > 0
                                  ? `R$ ${Number(s.default_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : '—'}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button onClick={() => openEditService(niche.id, s)}
                                    className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => deleteService(s.id)} disabled={deletingService === s.id}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                    {deletingService === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: niche form */}
      {showNicheForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-900">{editingNiche ? 'Editar nicho' : 'Novo nicho'}</h3>
              <button onClick={() => setShowNicheForm(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do nicho *</label>
            <input autoFocus value={nicheName} onChange={e => setNicheName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNiche()}
              placeholder="Ex: Projetos Estruturais"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowNicheForm(false)}
                className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
              <button onClick={saveNiche} disabled={!nicheName.trim() || savingNiche}
                className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {savingNiche && <Loader2 size={13} className="animate-spin" />}
                {editingNiche ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
