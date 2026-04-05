'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Search, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  address: string | null
  notes: string | null
  created_at: string
}

const EMPTY = {
  name: '', email: '', phone: '', cpf_cnpj: '', address: '', notes: '',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition'

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (data) setClients(data)
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', cpf_cnpj: c.cpf_cnpj || '', address: c.address || '', notes: c.notes || '' })
    setShowModal(true)
  }

  function set(key: keyof typeof EMPTY, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim() || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      cpf_cnpj: form.cpf_cnpj.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editing) {
      await supabase.from('clients').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('clients').insert({ ...payload, user_id: user.id })
    }

    setShowModal(false)
    await load()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    setDeleting(id)
    await supabase.from('clients').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj || '').includes(search)
  )

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-zinc-900 text-lg">Clientes</h1>
            <p className="text-xs text-zinc-500">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, e-mail ou CPF/CNPJ..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <User size={32} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
          {!search && <button onClick={openNew} className="mt-3 text-sm text-blue-600 font-semibold hover:underline">Cadastrar primeiro cliente</button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">CPF / CNPJ</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Telefone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cadastrado em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`${i < filtered.length - 1 ? 'border-b border-zinc-100' : ''} hover:bg-zinc-50 transition`}>
                  <td className="px-5 py-3.5 font-medium text-zinc-900">{c.name}</td>
                  <td className="px-5 py-3.5 text-zinc-500">{c.cpf_cnpj || '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-500">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-500">{c.email || '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-zinc-900">{editing ? 'Editar cliente' : 'Novo cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
                <X size={16} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Nome *">
                <input autoFocus value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Nome completo ou razão social" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPF / CNPJ">
                  <input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} className={inputCls} placeholder="000.000.000-00" />
                </Field>
                <Field label="Telefone">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
                </Field>
              </div>
              <Field label="E-mail">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="email@exemplo.com" />
              </Field>
              <Field label="Endereço">
                <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="Rua, número, cidade" />
              </Field>
              <Field label="Observações">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Notas sobre o cliente..." />
              </Field>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editing ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
