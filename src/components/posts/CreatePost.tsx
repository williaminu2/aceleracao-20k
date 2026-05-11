'use client'

import { useEffect, useRef, useState } from 'react'
import { Info, ImagePlus, X, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'

interface CreatePostProps {
  currentUser: { id: string; name: string; avatar?: string | null }
  channel: string
  adminOnly?: boolean
  onPost: () => void
}

export function CreatePost({ currentUser, channel, adminOnly, onPost }: CreatePostProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function checkRole() {
      const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
      setIsAdmin(data?.role === 'admin')
    }
    checkRole()
  }, [currentUser.id])

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Somente administradores da comunidade podem Compartilhar neste Canal.
        </p>
      </div>
    )
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploadingImage(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${currentUser.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('post-images').upload(path, file, { upsert: false })
    if (error) { setUploadingImage(false); return null }
    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    setUploadingImage(false)
    return data.publicUrl
  }

  async function handleSubmit() {
    if (!content.trim() || loading) return
    setLoading(true)

    let finalContent = content.trim()

    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (url) finalContent += `\n[img:${url}]`
    }

    await supabase.from('posts').insert({
      author_id: currentUser.id,
      channel: channel,
      content: finalContent,
    })

    setContent('')
    setImageFile(null)
    setImagePreview(null)
    setOpen(false)
    setLoading(false)
    onPost()
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      {!open ? (
        <div className="flex items-center gap-3 cursor-text" onClick={() => setOpen(true)}>
          <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
          <div className="flex-1 px-4 py-2 bg-zinc-100 rounded-full text-sm text-zinc-400 hover:bg-zinc-200 transition">
            No que está pensando, {currentUser.name.split(' ')[0]}?
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition"
            title="Adicionar imagem"
          >
            <ImagePlus size={18} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
            <span className="text-sm font-semibold text-zinc-900">{currentUser.name}</span>
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Compartilhe algo com a comunidade..."
            className="w-full min-h-[100px] text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none outline-none focus:ring-2 focus:ring-orange-400 transition"
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 rounded-lg border border-zinc-200 object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Image button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-orange-500 hover:bg-orange-50 border border-zinc-200 rounded-full transition font-medium"
            >
              {uploadingImage
                ? <Loader2 size={13} className="animate-spin" />
                : <ImagePlus size={13} />
              }
              Imagem
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            <div className="flex-1" />

            <button
              onClick={() => { setOpen(false); setContent(''); removeImage() }}
              className="px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-full transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || loading}
              className="px-4 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-full transition flex items-center gap-2"
            >
              {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Publicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
