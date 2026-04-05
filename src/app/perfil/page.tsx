'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Loader2, CheckCircle, Award, Download, ZoomIn, ZoomOut, X } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'conta', label: 'Conta' },
  { key: 'redes', label: 'Redes sociais' },
  { key: 'certificados', label: 'Certificados' },
]

// Gera imagem cortada usando canvas
async function getCroppedImg(imageSrc: string, croppedAreaPixels: any): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = 400 // exporta 400x400px
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, size, size
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob failed'))
    }, 'image/jpeg', 0.9)
  })
}

export default function PerfilPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeSection, setActiveSection] = useState('perfil')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // form fields
  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [slug, setSlug] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [certificates, setCertificates] = useState<any[]>([])
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // crop states
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setEmail(user.email || '')

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setTitle(data.title || '')
      setBio(data.bio || '')
      setSlug(data.slug || '')
      setLinkedin(data.linkedin || '')
      setInstagram(data.instagram || '')
      setWebsite(data.website || '')
      setAvatarUrl(data.avatar_url || null)
    }
    setLoading(false)
  }

  // Abre o seletor de arquivo → mostra o cropper
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)

    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecione uma imagem válida (JPG, PNG, etc)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('A imagem deve ter no máximo 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
    // Limpa o input para permitir selecionar o mesmo arquivo de novo
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels)
  }, [])

  // Confirma o corte e faz upload
  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) return
    setUploadingAvatar(true)
    setAvatarError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const blob = await getCroppedImg(cropSrc, croppedAreaPixels)
      const path = `${user.id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) {
        setAvatarError(`Erro: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setAvatarUrl(url)
      setCropSrc(null)
    } catch {
      setAvatarError('Erro ao processar a imagem. Tente novamente.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates: any = { full_name: fullName, title, bio, slug, linkedin, instagram, website }

    await supabase.from('profiles').update(updates).eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/comunidade')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="font-bold text-zinc-900">Configurações do perfil</h1>
      </div>

      <div className="max-w-3xl mx-auto py-6 px-4 flex gap-5">
        {/* Left nav */}
        <aside className="w-44 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => setActiveSection(item.key)}
                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-zinc-100 last:border-0 transition ${
                  activeSection === item.key
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* PERFIL */}
          {activeSection === 'perfil' && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Detalhes básicos</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Atualize os detalhes do seu perfil</p>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-100 bg-orange-500 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {fullName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-zinc-200 rounded-full flex items-center justify-center shadow hover:bg-zinc-50 transition"
                  >
                    {uploadingAvatar
                      ? <Loader2 size={13} className="animate-spin text-zinc-400" />
                      : <Camera size={13} className="text-zinc-600" />
                    }
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
                {avatarError ? (
                  <p className="text-xs text-red-500 text-center max-w-[220px]">{avatarError}</p>
                ) : (
                  <p className="text-xs text-zinc-400">Clique para alterar a foto</p>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nome completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                  <p className="text-xs text-orange-500 mt-1">Essas informações serão exibidas no seu perfil</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Arquiteto BIM | Consultor"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                  <p className="text-xs text-orange-500 mt-1">Essas informações serão exibidas no seu perfil</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Slug do Perfil</label>
                  <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition">
                    <span className="px-3 py-2.5 text-sm text-zinc-400 bg-zinc-50 border-r border-zinc-200">@</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="flex-1 px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTA */}
          {activeSection === 'conta' && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Conta</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Informações da sua conta</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-400 cursor-not-allowed"
                />
                <p className="text-xs text-zinc-400 mt-1">O e-mail não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Alterar senha</label>
                <button
                  onClick={async () => {
                    await supabase.auth.resetPasswordForEmail(email)
                    alert('E-mail de redefinição de senha enviado!')
                  }}
                  className="px-4 py-2.5 text-sm border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-700 transition font-medium"
                >
                  Enviar e-mail de redefinição
                </button>
              </div>
            </div>
          )}

          {/* REDES SOCIAIS */}
          {activeSection === 'redes' && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Redes sociais</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Exibidas no seu perfil público</p>
              </div>
              {[
                { label: 'LinkedIn', key: 'linkedin', value: linkedin, set: setLinkedin, placeholder: 'https://linkedin.com/in/seu-perfil' },
                { label: 'Instagram', key: 'instagram', value: instagram, set: setInstagram, placeholder: 'https://instagram.com/seu-usuario' },
                { label: 'Website', key: 'website', value: website, set: setWebsite, placeholder: 'https://seusite.com.br' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
                  <input
                    type="url"
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Footer buttons */}
          {activeSection !== 'conta' && (
            <div className="flex justify-end gap-3">
              <button onClick={() => router.push('/comunidade')}
                className="px-5 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center gap-2"
              >
                {saving
                  ? <Loader2 size={14} className="animate-spin" />
                  : saved
                  ? <CheckCircle size={14} />
                  : null
                }
                {saved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de corte da foto */}
      {cropSrc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Ajustar foto de perfil</h3>
              <button
                onClick={() => setCropSrc(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg transition"
              >
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            {/* Área de corte */}
            <div className="relative bg-zinc-900" style={{ height: 320 }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Controle de zoom */}
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <ZoomOut size={15} className="text-zinc-400 flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <ZoomIn size={15} className="text-zinc-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-zinc-400 text-center">
                Arraste para reposicionar · Use o controle para zoom
              </p>

              {avatarError && (
                <p className="text-xs text-red-500 text-center">{avatarError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setCropSrc(null)}
                  className="flex-1 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCropConfirm}
                  disabled={uploadingAvatar}
                  className="flex-1 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {uploadingAvatar && <Loader2 size={13} className="animate-spin" />}
                  Salvar foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
