'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, ChevronDown, Plus, Search, X, Loader2, Check, MapPin, User, Mail, Phone, FileText, Building2, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Dados estáticos ──────────────────────────────────────────────────────────

const STATES = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
  'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
  'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
  'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
  'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client { id: string; name: string; cpf_cnpj: string | null }

interface NicheService { id: string; niche_id: string; name: string; unit: string; default_price: number }
interface Niche { id: string; name: string; services: NicheService[] }

interface ServiceEntry {
  key: string       // unique key in table
  serviceId: string
  name: string
  quantity: string
  unit: string
  unit_price: string
  deadline: string
}

interface FormData {
  client_id: string
  client_name: string
  title: string
  estado: string
  cidade: string
  cep: string
  bairro: string
  logradouro: string
  numero: string
  complemento: string
  empreendimento_type: string
  area: string
  selected_niches: string[]
  services: ServiceEntry[]
  discount: string
  discount_type: '%' | 'R$'
  payment_terms: string
  valid_until: string
  follow_up_date: string
  apresentacao: string
  escopo: string
  condicoes: string
  observacoes: string
}

const EMPTY_FORM: FormData = {
  client_id: '', client_name: '', title: '',
  estado: 'Minas Gerais', cidade: '', cep: '',
  bairro: '', logradouro: '', numero: '', complemento: '',
  empreendimento_type: 'Residencial', area: '',
  selected_niches: [], services: [],
  discount: '', discount_type: '%',
  payment_terms: '', valid_until: '', follow_up_date: '',
  apresentacao: '', escopo: '', condicoes: '', observacoes: '',
}

const EMPREENDIMENTO_TYPES = ['Residencial', 'Comercial', 'Industrial', 'Institucional', 'Misto', 'Rural']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition bg-white'
const labelCls = 'block text-sm font-medium text-zinc-700 mb-1'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

function parseVal(s: string) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = ['Registro', 'Demanda', 'Prazos', 'Financeiro', 'Seções', 'Modelo']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 overflow-x-auto py-4 px-6 border-b border-zinc-200 bg-white">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2 px-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {done ? <Check size={13} /> : n}
              </div>
              <span className={`text-sm whitespace-nowrap ${active ? 'font-semibold text-blue-700' : done ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px flex-shrink-0 ${n < current ? 'bg-blue-600' : 'bg-zinc-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NovaPropostaPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientList, setShowClientList] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [niches, setNiches] = useState<Niche[]>([])
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false)
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState('')
  const clientRef = useRef<HTMLDivElement>(null)
  const nicheRef = useRef<HTMLDivElement>(null)

  // Modal de novo cliente (2 passos)
  const [showAddClient, setShowAddClient] = useState(false)
  const [clientStep, setClientStep] = useState(1)
  const [newClient, setNewClient] = useState({
    name: '', email: '', phone: '', docType: 'CPF', docNumber: '',
    cep: '', cidade: '', estado: '', bairro: '', endereco: '', numero: '', semNumero: false, complemento: '',
  })
  const [savingClient, setSavingClient] = useState(false)
  const [clientCepLoading, setClientCepLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('clients').select('id, name, cpf_cnpj').eq('user_id', user.id).order('name')
        .then(({ data }) => { if (data) setClients(data) })
      // Carregar nichos e serviços
      Promise.all([
        supabase.from('niches').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('niche_services').select('id, niche_id, name, unit, default_price').eq('user_id', user.id).order('name'),
      ]).then(([{ data: nicheData }, { data: svcData }]) => {
        if (nicheData) {
          setNiches(nicheData.map(n => ({
            ...n,
            services: (svcData || []).filter(s => s.niche_id === n.id),
          })))
        }
      })
    })
  }, [])

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientList(false)
      if (nicheRef.current && !nicheRef.current.contains(e.target as Node)) setNicheDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function setF<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Busca CEP via ViaCEP
  async function lookupCep(cep: string) {
    const cleaned = cep.replace(/\D/g, '')
    setF('cep', cleaned)
    if (cleaned.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          bairro: data.bairro || f.bairro,
          logradouro: data.logradouro || f.logradouro,
          cidade: data.localidade || f.cidade,
          estado: STATES.find(s => s.toLowerCase().startsWith(data.uf?.toLowerCase() || '')) || f.estado,
        }))
      }
    } catch {}
    setCepLoading(false)
  }

  // Nichos helpers
  function toggleNiche(id: string) {
    setForm(f => {
      const selected = f.selected_niches.includes(id)
      return { ...f, selected_niches: selected ? f.selected_niches.filter(n => n !== id) : [...f.selected_niches, id] }
    })
  }

  // Serviços helpers
  function addServiceEntry() {
    if (!selectedServiceToAdd) return
    const allSvcs = niches.flatMap(n => n.services)
    const svc = allSvcs.find(s => s.id === selectedServiceToAdd)
    if (!svc) return
    const entry: ServiceEntry = {
      key: `${svc.id}-${Date.now()}`,
      serviceId: svc.id,
      name: svc.name,
      quantity: '1',
      unit: svc.unit,
      unit_price: svc.default_price > 0 ? String(svc.default_price).replace('.', ',') : '',
      deadline: '',
    }
    setForm(f => ({ ...f, services: [...f.services, entry] }))
    setSelectedServiceToAdd('')
  }

  function removeServiceEntry(key: string) {
    setForm(f => ({ ...f, services: f.services.filter(s => s.key !== key) }))
  }

  function updateServiceField(key: string, field: keyof ServiceEntry, value: string) {
    setForm(f => ({ ...f, services: f.services.map(s => s.key === key ? { ...s, [field]: value } : s) }))
  }

  const subtotal = form.services.reduce((sum, s) => sum + parseVal(s.quantity) * parseVal(s.unit_price), 0)
  const discountAmt = form.discount_type === '%'
    ? subtotal * (parseVal(form.discount) / 100)
    : parseVal(form.discount)
  const totalValue = subtotal - discountAmt

  // Serviços disponíveis = todos os serviços dos nichos selecionados
  const availableServices = niches
    .filter(n => form.selected_niches.includes(n.id))
    .flatMap(n => n.services)

  // Validação por etapa — só cliente e empreendimento são obrigatórios
  function canProceed() {
    if (step === 1) return !!form.client_id && !!form.title.trim()
    return true
  }

  async function lookupClientCep(cep: string) {
    const cleaned = cep.replace(/\D/g, '')
    setNewClient(c => ({ ...c, cep: cleaned }))
    if (cleaned.length !== 8) return
    setClientCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setNewClient(c => ({
          ...c,
          bairro: data.bairro || c.bairro,
          endereco: data.logradouro || c.endereco,
          cidade: data.localidade || c.cidade,
          estado: data.uf || c.estado,
        }))
      }
    } catch {}
    setClientCepLoading(false)
  }

  async function handleAddClient() {
    if (!newClient.name.trim() || savingClient || !userId) return
    setSavingClient(true)

    const address = [
      newClient.endereco,
      newClient.semNumero ? 'S/N' : newClient.numero,
      newClient.complemento,
      newClient.bairro,
      newClient.cidade,
      newClient.estado,
      newClient.cep,
    ].filter(Boolean).join(', ')

    const { data } = await supabase.from('clients').insert({
      user_id: userId,
      name: newClient.name.trim(),
      email: newClient.email.trim() || null,
      phone: newClient.phone.trim() || null,
      cpf_cnpj: newClient.docNumber.trim() || null,
      address: address || null,
    }).select('id, name, cpf_cnpj').single()

    if (data) {
      setClients(c => [...c, data].sort((a, b) => a.name.localeCompare(b.name)))
      setF('client_id', data.id)
      setF('client_name', data.name)
      setShowAddClient(false)
      setClientStep(1)
      setNewClient({ name: '', email: '', phone: '', docType: 'CPF', docNumber: '', cep: '', cidade: '', estado: '', bairro: '', endereco: '', numero: '', semNumero: false, complemento: '' })
    }
    setSavingClient(false)
  }

  async function handleSave() {
    if (!userId || saving) return
    setSaving(true)

    // Gerar número sequencial
    const { data: existing } = await supabase.from('proposals').select('number').eq('user_id', userId).order('number', { ascending: false }).limit(1)
    const nextNumber = existing && existing.length > 0 ? existing[0].number + 1 : 1

    await supabase.from('proposals').insert({
      user_id: userId,
      number: nextNumber,
      client_id: form.client_id,
      client_name: form.client_name,
      title: form.title,
      status: 'sent',
      value: totalValue > 0 ? totalValue : null,
      valid_until: form.valid_until || null,
      follow_up_date: form.follow_up_date || null,
      estado: form.estado,
      cidade: form.cidade,
      cep: form.cep,
      bairro: form.bairro,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      services: form.services,
      payment_terms: form.payment_terms || null,
      sections: {
        apresentacao: form.apresentacao,
        escopo: form.escopo,
        condicoes: form.condicoes,
        observacoes: form.observacoes,
      },
      notes: form.observacoes || null,
    })

    router.push('/escritorio/propostas')
  }

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <StepBar current={step} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* ── Step 1: Registro ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                📄 Criando proposta
              </h2>
              <div className="w-full h-px bg-zinc-200" />

              {/* Cliente */}
              <Field label="Selecionar um cliente" required>
                <div className="relative" ref={clientRef}>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={form.client_id ? form.client_name : clientSearch}
                      onChange={e => {
                        if (form.client_id) { setF('client_id', ''); setF('client_name', '') }
                        setClientSearch(e.target.value)
                        setShowClientList(true)
                      }}
                      onFocus={() => setShowClientList(true)}
                      placeholder="Busque pelo Cliente"
                      className={inputCls + ' pl-9 pr-10'}
                    />
                    {form.client_id ? (
                      <button onClick={() => { setF('client_id', ''); setF('client_name', ''); setClientSearch('') }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                        <X size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowAddClient(true); setShowClientList(false) }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-600 transition"
                        title="Adicionar novo cliente"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  {showClientList && !form.client_id && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <p className="text-sm text-zinc-400 px-4 py-3">Nenhum cliente encontrado</p>
                      ) : filteredClients.map(c => (
                        <button key={c.id} onClick={() => { setF('client_id', c.id); setF('client_name', c.name); setShowClientList(false) }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition">
                          <p className="font-medium text-zinc-900">{c.name}</p>
                          {c.cpf_cnpj && <p className="text-xs text-zinc-400">{c.cpf_cnpj}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              {/* Empreendimento */}
              <Field label="Nome do Empreendimento" required>
                <input value={form.title} onChange={e => setF('title', e.target.value)}
                  placeholder="Empreendimento" className={inputCls} />
              </Field>

              {/* Estado + Cidade */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estado">
                  <select value={form.estado} onChange={e => setF('estado', e.target.value)} className={inputCls}>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Cidade">
                  <input value={form.cidade} onChange={e => setF('cidade', e.target.value)}
                    placeholder="Cidade" className={inputCls} />
                </Field>
              </div>

              {/* CEP */}
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-3">Sessão opcional:</p>
                <Field label="CEP">
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input value={form.cep}
                      onChange={e => lookupCep(e.target.value)}
                      placeholder="00000-000" maxLength={9}
                      className={inputCls + ' pl-9 pr-8'} />
                    {cepLoading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
                  </div>
                </Field>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Bairro">
                  <input value={form.bairro} onChange={e => setF('bairro', e.target.value)} placeholder="Bairro" className={inputCls} />
                </Field>
                <Field label="Logradouro">
                  <input value={form.logradouro} onChange={e => setF('logradouro', e.target.value)} placeholder="Rua / Av." className={inputCls} />
                </Field>
                <Field label="Número">
                  <input value={form.numero} onChange={e => setF('numero', e.target.value)} placeholder="Nº" className={inputCls} />
                </Field>
              </div>

              <Field label="Complemento">
                <input value={form.complemento} onChange={e => setF('complemento', e.target.value)} placeholder="Apto, Sala, Bloco..." className={inputCls} />
              </Field>
            </div>
          )}

          {/* ── Step 2: Demanda ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                📄 Criando proposta
              </h2>
              <div className="w-full h-px bg-zinc-200" />

              {/* Tipo de Empreendimento */}
              <Field label="Tipo de Empreendimento">
                <select value={form.empreendimento_type} onChange={e => setF('empreendimento_type', e.target.value)} className={inputCls}>
                  {EMPREENDIMENTO_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>

              {/* Área Construída */}
              <Field label="Área Construída do Empreendimento">
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="number" value={form.area} onChange={e => setF('area', e.target.value)}
                    placeholder="0,00" className={inputCls + ' pl-9 pr-12'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium">m²</span>
                </div>
              </Field>

              {/* Seleção de Nichos */}
              <Field label="Selecione um Nicho">
                <div className="relative" ref={nicheRef}>
                  <div
                    onClick={() => setNicheDropdownOpen(v => !v)}
                    className={`${inputCls} cursor-pointer flex items-center flex-wrap gap-1.5 min-h-[42px]`}
                  >
                    {form.selected_niches.length === 0 ? (
                      <span className="text-zinc-400 text-sm">Selecionar nicho...</span>
                    ) : form.selected_niches.map(id => {
                      const n = niches.find(x => x.id === id)
                      if (!n) return null
                      return (
                        <span key={id} className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {n.name}
                          <button type="button" onClick={e => { e.stopPropagation(); toggleNiche(id) }} className="hover:text-blue-900 ml-0.5">
                            <X size={10} />
                          </button>
                        </span>
                      )
                    })}
                    <ChevronDown size={14} className={`text-zinc-400 ml-auto flex-shrink-0 transition-transform ${nicheDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {nicheDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {niches.length === 0 ? (
                        <p className="text-sm text-zinc-400 px-4 py-3">Nenhum nicho cadastrado. Acesse Configurações para criar.</p>
                      ) : niches.map(n => {
                        const sel = form.selected_niches.includes(n.id)
                        return (
                          <button key={n.id} type="button" onClick={() => toggleNiche(n.id)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2.5 transition">
                            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${sel ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'}`}>
                              {sel && <Check size={10} className="text-white" />}
                            </div>
                            <span className="font-medium text-zinc-800">{n.name}</span>
                            <span className="text-xs text-zinc-400 ml-auto">{n.services.length} serviço{n.services.length !== 1 ? 's' : ''}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Field>

              {/* Adicionar serviço */}
              <Field label="Adicionar serviço">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <select value={selectedServiceToAdd} onChange={e => setSelectedServiceToAdd(e.target.value)}
                      className={inputCls + ' pl-9 appearance-none'}
                      disabled={form.selected_niches.length === 0}>
                      <option value="">{form.selected_niches.length === 0 ? 'Selecione um nicho primeiro...' : 'Selecione...'}</option>
                      {availableServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={addServiceEntry} disabled={!selectedServiceToAdd}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-blue-500 text-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <Plus size={18} />
                  </button>
                </div>
              </Field>

              {/* Tabela de serviços */}
              {form.services.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                  <p className="text-xs text-blue-600 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                    Os campos &apos;Quantidade&apos;, &apos;Unidade&apos; e &apos;Valor Unitário&apos; podem ser editados; é só clicar neles.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-center px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide">Serviço</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide w-24">Quantidade</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide w-20">Unidade</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide w-28">Valor Unitário</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide w-24 leading-tight">Valor<br/>Total</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.services.map((s, i) => {
                        const lineTotal = parseVal(s.quantity) * parseVal(s.unit_price)
                        return (
                          <tr key={s.key} className={`${i < form.services.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                            <td className="px-4 py-3 font-semibold text-zinc-800 text-center text-xs leading-tight">{s.name}</td>
                            <td className="px-3 py-3 text-center">
                              <input type="number" value={s.quantity}
                                onChange={e => updateServiceField(s.key, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-center" />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <input value={s.unit}
                                onChange={e => updateServiceField(s.key, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-center" />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <input value={s.unit_price}
                                onChange={e => updateServiceField(s.key, 'unit_price', e.target.value)}
                                placeholder="0,00"
                                className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-center" />
                            </td>
                            <td className="px-3 py-3 text-center font-semibold text-zinc-700 text-sm whitespace-nowrap">
                              {lineTotal > 0 ? lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button type="button" onClick={() => removeServiceEntry(s.key)}
                                className="w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition mx-auto">
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Subtotal / Desconto / Total */}
                  <div className="border-t border-zinc-200 px-4 py-4 space-y-3 bg-white">
                    {/* Subtotal */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">Subtotal</label>
                      <div className="relative">
                        <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <div className={inputCls + ' pl-9 text-zinc-500 bg-zinc-50 cursor-default'}>
                          {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    </div>

                    {/* Desconto */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">Desconto</label>
                      <div className="flex gap-0">
                        <input value={form.discount} onChange={e => setF('discount', e.target.value)}
                          placeholder={form.discount_type === '%' ? '%' : 'R$'}
                          className="flex-1 px-3 py-2.5 text-sm border border-zinc-200 rounded-l-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                        <div className="flex border border-l-0 border-zinc-200 rounded-r-xl overflow-hidden flex-shrink-0">
                          {(['%', 'R$'] as const).map(t => (
                            <button key={t} type="button" onClick={() => setF('discount_type', t)}
                              className={`px-3 py-2.5 text-xs font-semibold transition border-l border-zinc-200 first:border-l-0 ${form.discount_type === t ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-1 border-t border-zinc-100">
                      <p className="text-base font-bold text-zinc-900">
                        Total: <span className="text-blue-600">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {form.services.length === 0 && (
                <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl p-6 text-center">
                  <p className="text-sm text-zinc-400">
                    {form.selected_niches.length === 0
                      ? 'Selecione um nicho para ver os serviços disponíveis'
                      : 'Selecione um serviço acima para adicioná-lo à proposta'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Prazos ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900">Prazos de entrega</h2>
              <p className="text-sm text-zinc-500">Defina a data de entrega para cada serviço</p>
              <div className="w-full h-px bg-zinc-200" />

              {form.services.length === 0 ? (
                <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl p-8 text-center">
                  <p className="text-sm text-zinc-400">Nenhum serviço adicionado na etapa anterior</p>
                </div>
              ) : form.services.map(s => (
                <div key={s.key} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">{s.name}</p>
                  <Field label="Data de entrega">
                    <input type="date" value={s.deadline} onChange={e => updateServiceField(s.key, 'deadline', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Financeiro ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900">Financeiro</h2>
              <p className="text-sm text-zinc-500">Condições de pagamento e datas importantes</p>
              <div className="w-full h-px bg-zinc-200" />

              {/* Resumo de valores */}
              <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                {form.services.map(s => {
                  const lineTotal = parseVal(s.quantity) * parseVal(s.unit_price)
                  return (
                    <div key={s.key} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-zinc-700">{s.name} <span className="text-zinc-400 text-xs">({s.quantity} {s.unit})</span></span>
                      <span className="font-semibold text-zinc-900">{lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  )
                })}
                {form.discount && parseVal(form.discount) > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-red-500">
                    <span>Desconto ({form.discount_type === '%' ? `${form.discount}%` : `R$ ${form.discount}`})</span>
                    <span>– {discountAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-blue-600 rounded-b-xl">
                  <span className="text-white font-semibold text-sm">Total da Proposta</span>
                  <span className="text-white font-bold text-lg">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                <Field label="Condições de pagamento">
                  <textarea value={form.payment_terms} onChange={e => setF('payment_terms', e.target.value)}
                    rows={3} placeholder="Ex: 50% na assinatura do contrato, 50% na entrega final"
                    className={inputCls + ' resize-none'} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Validade da proposta">
                    <input type="date" value={form.valid_until} onChange={e => setF('valid_until', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Data de follow-up">
                    <input type="date" value={form.follow_up_date} onChange={e => setF('follow_up_date', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Seções ── */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900">Seções da proposta</h2>
              <p className="text-sm text-zinc-500">Texto que irá compor o documento da proposta</p>
              <div className="w-full h-px bg-zinc-200" />

              {[
                { key: 'apresentacao', label: 'Apresentação', placeholder: 'Apresente sua empresa e o contexto da proposta...' },
                { key: 'escopo', label: 'Escopo dos Serviços', placeholder: 'Descreva detalhadamente o que está incluído...' },
                { key: 'condicoes', label: 'Condições Gerais', placeholder: 'Condições de contratação, responsabilidades, exclusões...' },
                { key: 'observacoes', label: 'Observações', placeholder: 'Informações adicionais relevantes...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <Field label={label}>
                    <textarea
                      value={form[key as keyof FormData] as string}
                      onChange={e => setF(key as keyof FormData, e.target.value as any)}
                      rows={4} placeholder={placeholder}
                      className={inputCls + ' resize-none'}
                    />
                  </Field>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 6: Modelo / Revisão ── */}
          {step === 6 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900">Revisão da proposta</h2>
              <p className="text-sm text-zinc-500">Confirme os dados antes de criar a proposta</p>
              <div className="w-full h-px bg-zinc-200" />

              <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                <div className="p-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">Cliente</p>
                  <p className="text-sm font-semibold text-zinc-900">{form.client_name}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">Empreendimento</p>
                  <p className="text-sm font-semibold text-zinc-900">{form.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{form.cidade}{form.cidade && form.estado ? ', ' : ''}{form.estado}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">Serviços ({form.services.length})</p>
                  <div className="space-y-1.5">
                    {form.services.map(s => {
                      const lineTotal = parseVal(s.quantity) * parseVal(s.unit_price)
                      return (
                        <div key={s.key} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-700">{s.name} <span className="text-zinc-400 text-xs">× {s.quantity} {s.unit}</span></span>
                          <span className="font-semibold text-zinc-900">{lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {form.discount && parseVal(form.discount) > 0 && (
                  <div className="p-4 flex items-center justify-between text-sm text-red-500">
                    <span>Desconto ({form.discount_type === '%' ? `${form.discount}%` : `R$ ${form.discount}`})</span>
                    <span>– {discountAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-700">Total</p>
                  <p className="text-lg font-bold text-blue-600">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                {form.valid_until && (
                  <div className="p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Validade</p>
                    <p className="text-sm text-zinc-700">{new Date(form.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {form.payment_terms && (
                  <div className="p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Pagamento</p>
                    <p className="text-sm text-zinc-700">{form.payment_terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: adicionar cliente */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 flex-shrink-0">
              <h3 className="font-bold text-zinc-900 text-base">Adicionar cliente</h3>
              <button onClick={() => { setShowAddClient(false); setClientStep(1) }} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* ── Passo 1: Dados pessoais ── */}
              {clientStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input autoFocus value={newClient.name} onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))}
                        placeholder="Digite o nome do seu cliente"
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input type="email" value={newClient.email} onChange={e => setNewClient(c => ({ ...c, email: e.target.value }))}
                        placeholder="exemplo@gmail.com"
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 text-sm flex-shrink-0">
                        🇧🇷 <span className="text-xs text-zinc-400">+55</span>
                      </div>
                      <input value={newClient.phone} onChange={e => setNewClient(c => ({ ...c, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        className="flex-1 px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Documento</label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <select value={newClient.docType} onChange={e => setNewClient(c => ({ ...c, docType: e.target.value, docNumber: '' }))}
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition appearance-none bg-white">
                          <option>CPF</option>
                          <option>CNPJ</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Número do {newClient.docType}</label>
                      <input value={newClient.docNumber} onChange={e => setNewClient(c => ({ ...c, docNumber: e.target.value }))}
                        placeholder={newClient.docType === 'CPF' ? '000.000.000-00' : '00.000.000/0001-00'}
                        className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                  </div>
                </>
              )}

              {/* ── Passo 2: Endereço ── */}
              {clientStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">CEP</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input value={newClient.cep} onChange={e => lookupClientCep(e.target.value)}
                        placeholder="00000-000" maxLength={9}
                        className="w-full pl-9 pr-8 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                      {clientCepLoading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Cidade</label>
                      <input value={newClient.cidade} onChange={e => setNewClient(c => ({ ...c, cidade: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Estado</label>
                      <input value={newClient.estado} onChange={e => setNewClient(c => ({ ...c, estado: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Bairro</label>
                    <input value={newClient.bairro} onChange={e => setNewClient(c => ({ ...c, bairro: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Endereço</label>
                    <input value={newClient.endereco} onChange={e => setNewClient(c => ({ ...c, endereco: e.target.value }))}
                      placeholder="Rua / Avenida"
                      className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Número</label>
                    <div className="flex items-center gap-3">
                      <input value={newClient.semNumero ? '' : newClient.numero}
                        onChange={e => setNewClient(c => ({ ...c, numero: e.target.value }))}
                        disabled={newClient.semNumero}
                        placeholder="Nº"
                        className="flex-1 px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-zinc-50 disabled:text-zinc-400" />
                      <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={newClient.semNumero}
                          onChange={e => setNewClient(c => ({ ...c, semNumero: e.target.checked, numero: '' }))}
                          className="w-4 h-4 accent-blue-600" />
                        Sem número
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Complemento (opcional)</label>
                    <textarea value={newClient.complemento} onChange={e => setNewClient(c => ({ ...c, complemento: e.target.value }))}
                      rows={3} placeholder="Apto, Sala, Bloco..."
                      className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition resize-none" />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-6 pt-2 flex-shrink-0">
              {clientStep === 2 ? (
                <button onClick={() => setClientStep(1)}
                  className="px-5 py-2.5 text-sm font-semibold border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 transition">
                  Voltar
                </button>
              ) : <div />}

              {clientStep === 1 ? (
                <button onClick={() => setClientStep(2)} disabled={!newClient.name.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
                  Próximo
                </button>
              ) : (
                <button onClick={handleAddClient} disabled={savingClient}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
                  {savingClient && <Loader2 size={14} className="animate-spin" />}
                  Cadastrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer com navegação */}
      <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-4 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition">
            <ChevronLeft size={16} /> Voltar
          </button>
        )}
        <button onClick={() => router.push('/escritorio/propostas')}
          className="px-5 py-3 text-sm text-zinc-400 hover:text-zinc-600 transition">
          Cancelar
        </button>
        <div className="flex-1" />
        {step < 6 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
          >
            Próxima Etapa <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Criar Proposta
          </button>
        )}
      </div>
    </div>
  )
}
