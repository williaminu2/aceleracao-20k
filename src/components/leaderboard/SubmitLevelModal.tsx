'use client'

import { useState } from 'react'
import { X, Upload, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LEVELS } from '@/lib/levels'

interface SubmitLevelModalProps {
  currentLevel: number
  pendingSubmission: any | null
  onClose: () => void
  onSubmitted: () => void
}

export function SubmitLevelModal({ currentLevel, pendingSubmission, onClose, onSubmitted }: SubmitLevelModalProps) {
  const nextLevel = LEVELS[currentLevel + 1]
  const [amountReceived, setAmountReceived] = useState('')
  const [amountContracted, setAmountContracted] = useState('')
  const [description, setDescription] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!description.trim() || submitting) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('level_submissions').insert({
      user_id: user.id,
      target_level: currentLevel + 1,
      amount_received: amountReceived ? parseFloat(amountReceived.replace(/\./g, '').replace(',', '.')) : null,
      amount_contracted: amountContracted ? parseFloat(amountContracted.replace(/\./g, '').replace(',', '.')) : null,
      proof_description: description.trim(),
      proof_url: proofUrl.trim() || null,
      status: 'pending',
    })

    setDone(true)
    setSubmitting(false)
    setTimeout(() => { onSubmitted(); onClose() }, 1500)
  }

  if (!nextLevel) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div>
            <h2 className="font-bold text-zinc-900">Submeter Comprovante</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Solicitar upgrade para {nextLevel.faixa}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        {/* Status de submissão pendente */}
        {pendingSubmission && (
          <div className="mx-5 mt-4 p-3 rounded-xl border flex items-start gap-3 bg-yellow-50 border-yellow-200">
            <Clock size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Submissão em análise</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Você já tem uma solicitação para {LEVELS[pendingSubmission.target_level]?.faixa} aguardando aprovação.
              </p>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Requisito */}
          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200">
            <p className="text-xs font-semibold text-zinc-700 mb-1">Requisito para {nextLevel.faixa}</p>
            <p className="text-sm text-zinc-600">{nextLevel.requirement}</p>
          </div>

          {/* Valores */}
          {nextLevel.minReceived && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Valor Recebido (R$)</label>
                <input
                  type="text"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  placeholder="Ex: 5.000,00"
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Valor Contratado (R$)</label>
                <input
                  type="text"
                  value={amountContracted}
                  onChange={e => setAmountContracted(e.target.value)}
                  placeholder="Ex: 10.000,00"
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Descrição do comprovante *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva brevemente o(s) contrato(s) ou pagamento(s) que comprovam este resultado..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
            />
          </div>

          {/* Link do comprovante */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Link do comprovante</label>
            <input
              type="url"
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://drive.google.com/... ou outro link"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
            <p className="text-xs text-zinc-400">Cole o link de um Google Drive, Dropbox ou similar com os comprovantes</p>
          </div>

          {/* Botões */}
          {done ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-sm font-semibold text-green-700">Enviado com sucesso!</span>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || submitting}
                className="flex-1 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Enviar para análise
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
