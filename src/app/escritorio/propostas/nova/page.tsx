'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Plus, Search, X, Loader2, Check, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Dados estáticos ──────────────────────────────────────────────────────────

const STATES = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
  'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
  'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
  'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
  'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
]

const BIM_SERVICES = [
  { id: 'arq', label: 'Projeto Arquitetônico' },
  { id: 'est', label: 'Projeto Estrutural' },
  { id: 'hid', label: 'Projeto Hidrossanitário' },
  { id: 'ele', label: 'Projeto Elétrico' },
  { id: 'hvac', label: 'Projeto de Climatização (HVAC)' },
  { id: 'inc', label: 'Projeto de Incêndio e Pânico' },
  { id: 'bim', label: 'Modelagem BIM' },
  { id: 'coord', label: 'Coordenação BIM' },
  { id: 'int', label: 'Projeto de Interiores' },
  { id: 'pai', label: 'Projeto Paisagístico' },
  { id: 'top', label: 'Levantamento Topográfico' },
  { id: 'lau', label: 'Laudo Técnico' },
  { id: 'consult', label: 'Consultoria BIM' },
  { id: 'out', label: 'Outros' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client { id: string; name: string; cpf_cnpj: string | null }

interface ServiceEntry {
  id: string
  label: string
  area: string
  description: string
  deadline: string
  value: string
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
  services: ServiceEntry[]
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
  services: [],
  payment_terms: '', valid_until: '', follow_up_date: '',
  apresentacao: '', escopo: '', condicoes: '', observacoes: '',
}

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

function fmt(v: string) {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  const clientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('clients').select('id, name, cpf_cnpj').eq('user_id', user.id).order('name')
        .then(({ data }) => { if (data) setClients(data) })
    })
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientList(false)
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

  // Toggle serviço
  function toggleService(svc: typeof BIM_SERVICES[0]) {
    setForm(f => {
      const exists = f.services.find(s => s.id === svc.id)
      if (exists) return { ...f, services: f.services.filter(s => s.id !== svc.id) }
      return { ...f, services: [...f.services, { id: svc.id, label: svc.label, area: '', description: '', deadline: '', value: '' }] }
    })
  }

  function updateService(id: string, key: keyof ServiceEntry, value: string) {
    setForm(f => ({ ...f, services: f.services.map(s => s.id === id ? { ...s, [key]: value } : s) }))
  }

  const totalValue = form.services.reduce((sum, s) => sum + parseVal(s.value), 0)

  // Validação por etapa
  function canProceed() {
    if (step === 1) return !!form.client_id && !!form.title.trim()
    if (step === 2) return form.services.length > 0
    if (step === 3) return form.services.every(s => !!s.deadline)
    if (step === 4) return form.services.every(s => !!s.value)
    return true
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
      value: totalValue,
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
                        onClick={() => router.push('/escritorio/clientes')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-600 transition"
                        title="Cadastrar novo cliente"
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
                <Field label="Estado" required>
                  <select value={form.estado} onChange={e => setF('estado', e.target.value)} className={inputCls}>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Cidade" required>
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
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900">Demanda de serviços</h2>
              <p className="text-sm text-zinc-500">Selecione os serviços que farão parte desta proposta</p>
              <div className="w-full h-px bg-zinc-200" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BIM_SERVICES.map(svc => {
                  const selected = form.services.find(s => s.id === svc.id)
                  return (
                    <button key={svc.id} onClick={() => toggleService(svc)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                        selected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'
                      }`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium">{svc.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Detalhes dos serviços selecionados */}
              {form.services.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-semibold text-zinc-700">Detalhes dos serviços selecionados</p>
                  {form.services.map(s => (
                    <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-700">{s.label}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Área (m²)">
                          <input value={s.area} onChange={e => updateService(s.id, 'area', e.target.value)}
                            placeholder="Ex: 150" className={inputCls} />
                        </Field>
                        <Field label="Descrição resumida">
                          <input value={s.description} onChange={e => updateService(s.id, 'description', e.target.value)}
                            placeholder="Opcional" className={inputCls} />
                        </Field>
                      </div>
                    </div>
                  ))}
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

              {form.services.map(s => (
                <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">{s.label}</p>
                  <Field label="Data de entrega" required>
                    <input type="date" value={s.deadline} onChange={e => updateService(s.id, 'deadline', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Financeiro ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-zinc-900">Financeiro</h2>
              <p className="text-sm text-zinc-500">Defina os valores de cada serviço e as condições de pagamento</p>
              <div className="w-full h-px bg-zinc-200" />

              {form.services.map(s => (
                <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-zinc-900">{s.label}</p>
                    {s.area && <span className="text-xs text-zinc-400">{s.area} m²</span>}
                  </div>
                  <Field label="Valor (R$)" required>
                    <input value={s.value} onChange={e => updateService(s.id, 'value', e.target.value)}
                      placeholder="0,00" className={inputCls} />
                  </Field>
                </div>
              ))}

              {/* Total */}
              <div className="bg-blue-600 rounded-xl p-4 flex items-center justify-between">
                <span className="text-white font-semibold text-sm">Total da Proposta</span>
                <span className="text-white font-bold text-lg">{fmt(String(totalValue))}</span>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
                <Field label="Condições de pagamento">
                  <textarea value={form.payment_terms} onChange={e => setF('payment_terms', e.target.value)}
                    rows={2} placeholder="Ex: 50% na assinatura, 50% na entrega"
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
                  <div className="space-y-1">
                    {form.services.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-700">{s.label}{s.area ? ` — ${s.area}m²` : ''}</span>
                        <span className="font-semibold text-zinc-900">{fmt(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-700">Total</p>
                  <p className="text-lg font-bold text-blue-600">{fmt(String(totalValue))}</p>
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
