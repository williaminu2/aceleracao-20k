'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ThumbsUp, MessageCircle, Send, ChevronDown, ChevronUp,
  MoreHorizontal, Link2, Flag, Trash2, MoveRight, Pencil, MessageSquareOff, Check,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { MemberProfileModal } from '@/components/membros/MemberProfileModal'

export interface Post {
  id: string
  author: string
  authorId?: string
  authorAvatar?: string | null
  authorLevel?: number
  channel: string
  content: string
  likes: number
  comments: number
  createdAt: string
  pinned?: boolean
  likedByMe?: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  author_id: string
  profiles: { full_name: string; avatar_url: string | null; level: number } | null
}

interface Channel {
  id: string
  label: string
}

interface PostCardProps {
  post: Post
  featured?: boolean
  onDeleted?: (id: string) => void
}

function parseContent(raw: string): { text: string; imageUrl: string | null } {
  const match = raw.match(/\[img:(https?:\/\/[^\]]+)\]/)
  if (match) {
    return { text: raw.replace(match[0], '').trim(), imageUrl: match[1] }
  }
  return { text: raw, imageUrl: null }
}

export function PostCard({ post, featured, onDeleted }: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByMe ?? false)
  const [likes, setLikes] = useState(post.likes)
  const [likeLoading, setLikeLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(post.comments)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myProfile, setMyProfile] = useState<{ id: string; full_name: string; avatar_url: string | null; role: string } | null>(null)

  const [showMenu, setShowMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [editContent, setEditContent] = useState(post.content)
  const [editSaving, setEditSaving] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [feedbackDisabled, setFeedbackDisabled] = useState(false)
  const [profileModalId, setProfileModalId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { text: postText, imageUrl: postImage } = parseContent(post.content)

  useEffect(() => {
    async function loadMe() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, role').eq('id', user.id).single()
      if (data) setMyProfile(data as any)
    }
    loadMe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isOwner = myProfile?.id === post.authorId
  const isAdmin = myProfile?.role === 'admin'
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin
  const canMove = isAdmin

  async function handleLike() {
    if (likeLoading || feedbackDisabled) return
    setLikeLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLikeLoading(false); return }
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      setLiked(false); setLikes(l => l - 1)
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
      setLiked(true); setLikes(l => l + 1)
    }
    setLikeLoading(false)
  }

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, author_id, profiles (full_name, avatar_url, level)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data as any)
    setCommentsLoaded(true)
  }

  function toggleComments() {
    if (!showComments && !commentsLoaded) loadComments()
    setShowComments(v => !v)
  }

  async function handleSubmitComment() {
    if (!newComment.trim() || submitting || feedbackDisabled) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }
    const { data } = await supabase.from('comments')
      .insert({ post_id: post.id, author_id: user.id, content: newComment.trim() })
      .select('id, content, created_at, author_id, profiles (full_name, avatar_url, level)')
      .single()
    if (data) { setComments(prev => [...prev, data as any]); setCommentCount(c => c + 1) }
    setNewComment('')
    setSubmitting(false)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/comunidade?post=${post.id}`)
    setLinkCopied(true)
    setTimeout(() => { setLinkCopied(false); setShowMenu(false) }, 1500)
  }

  async function handleDelete() {
    if (!confirm('Excluir esta publicação permanentemente?')) return
    setShowMenu(false)
    await supabase.from('posts').delete().eq('id', post.id)
    setDeleted(true)
    onDeleted?.(post.id)
  }

  async function handleReport() {
    setShowMenu(false)
    alert('Publicação denunciada. Nossa equipe irá revisar em breve.')
  }

  async function handleMove(channelLabel: string) {
    await supabase.from('posts').update({ channel: channelLabel }).eq('id', post.id)
    setShowMoveModal(false)
    setShowMenu(false)
  }

  async function handleEdit() {
    if (!editContent.trim() || editSaving) return
    setEditSaving(true)
    await supabase.from('posts').update({ content: editContent.trim() }).eq('id', post.id)
    setShowEditModal(false)
    setEditSaving(false)
    setShowMenu(false)
  }

  async function loadChannels() {
    const { data } = await supabase.from('channels').select('id, label').order('order_index')
    if (data) setChannels(data)
  }

  if (deleted) return null

  return (
    <>
      <div className={`bg-white rounded-xl border border-zinc-200 ${featured ? 'max-w-xs flex-shrink-0' : 'w-full'}`}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-center gap-2">
            <Avatar
              name={post.author}
              src={post.authorAvatar}
              size="sm"
              level={post.authorLevel}
              onClick={post.authorId ? () => setProfileModalId(post.authorId!) : undefined}
            />
            <div>
              <button
                className="text-sm font-semibold text-zinc-900 leading-tight hover:text-orange-500 transition text-left"
                onClick={post.authorId ? () => setProfileModalId(post.authorId!) : undefined}
              >
                {post.author}
              </button>
              <p className="text-[11px] text-zinc-400 leading-tight">
                {timeAgo(post.createdAt)} em{' '}
                <span className="text-orange-500 font-medium">{post.channel}</span>
              </p>
            </div>
          </div>

          {/* Menu ··· */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-1.5 hover:bg-zinc-100 rounded-lg transition text-zinc-400 hover:text-zinc-700"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-52 bg-white rounded-xl shadow-xl border border-zinc-200 z-30 overflow-hidden py-1">
                <MenuItem
                  icon={linkCopied ? Check : Link2}
                  label={linkCopied ? 'Link copiado!' : 'Copiar link'}
                  onClick={handleCopyLink}
                  color={linkCopied ? 'text-green-600' : undefined}
                />
                <MenuItem icon={Flag} label="Denunciar publicação" onClick={handleReport} />
                {canDelete && <MenuItem icon={Trash2} label="Excluir publicação" onClick={handleDelete} color="text-red-500" />}
                {canMove && (
                  <MenuItem
                    icon={MoveRight}
                    label="Mover para canal"
                    onClick={() => { loadChannels(); setShowMoveModal(true); setShowMenu(false) }}
                  />
                )}
                {canEdit && (
                  <MenuItem
                    icon={Pencil}
                    label="Editar publicação"
                    onClick={() => { setEditContent(post.content); setShowEditModal(true); setShowMenu(false) }}
                  />
                )}
                <MenuItem
                  icon={MessageSquareOff}
                  label={feedbackDisabled ? 'Habilitar feedback' : 'Desabilitar feedback'}
                  onClick={() => { setFeedbackDisabled(v => !v); setShowMenu(false) }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
          {postText}
        </div>

        {/* Image */}
        {postImage && (
          <div className="px-4 pb-3">
            <img
              src={postImage}
              alt="Imagem do post"
              className="w-full rounded-xl border border-zinc-100 object-cover max-h-80"
              loading="lazy"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-zinc-100">
          <button
            onClick={handleLike}
            disabled={likeLoading || feedbackDisabled}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              feedbackDisabled ? 'opacity-30 cursor-not-allowed' :
              liked ? 'text-orange-500' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <ThumbsUp size={14} />
            <span>{likes}</span>
          </button>
          <button
            onClick={toggleComments}
            disabled={feedbackDisabled}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              feedbackDisabled ? 'opacity-30 cursor-not-allowed' :
              showComments ? 'text-orange-500' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <MessageCircle size={14} />
            <span>{commentCount}</span>
            {!feedbackDisabled && (showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
        </div>

        {/* Comments */}
        {showComments && !feedbackDisabled && (
          <div className="border-t border-zinc-100">
            {comments.length > 0 && (
              <div className="px-4 py-3 space-y-4 max-h-72 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar
                      name={c.profiles?.full_name || 'Membro'}
                      src={c.profiles?.avatar_url}
                      size="sm"
                      onClick={() => setProfileModalId(c.author_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-zinc-50 rounded-xl px-3 py-2">
                        <button
                          className="text-xs font-semibold text-zinc-800 mb-0.5 hover:text-orange-500 transition text-left"
                          onClick={() => setProfileModalId(c.author_id)}
                        >
                          {c.profiles?.full_name || 'Membro'}
                        </button>
                        <p className="text-sm text-zinc-700 leading-relaxed">{c.content}</p>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 pl-1">{timeAgo(c.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!commentsLoaded && (
              <div className="flex justify-center py-4">
                <span className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            )}
            {commentsLoaded && comments.length === 0 && (
              <p className="text-center text-xs text-zinc-400 py-4">Seja o primeiro a comentar!</p>
            )}
            <div className="px-4 py-3 border-t border-zinc-100 flex gap-2.5 items-center">
              <Avatar name={myProfile?.full_name || 'Eu'} src={myProfile?.avatar_url} size="sm" />
              <div className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-orange-400 transition">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                  placeholder="Escreva um comentário..."
                  className="flex-1 text-sm bg-transparent outline-none text-zinc-700 placeholder:text-zinc-400"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="text-orange-500 hover:text-orange-600 disabled:opacity-30 transition flex-shrink-0"
                >
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin block" />
                    : <Send size={15} />
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Mover para canal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowMoveModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="font-bold text-zinc-900 mb-4">Mover para canal</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {channels.map(c => (
                <button key={c.id} onClick={() => handleMove(c.label)}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition font-medium">
                  {c.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMoveModal(false)}
              className="mt-4 w-full py-2.5 text-sm text-zinc-500 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Editar publicação */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <h3 className="font-bold text-zinc-900">Editar publicação</h3>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button onClick={handleEdit} disabled={!editContent.trim() || editSaving}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center gap-2">
                {editSaving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member profile modal */}
      {profileModalId && (
        <MemberProfileModal memberId={profileModalId} onClose={() => setProfileModalId(null)} />
      )}
    </>
  )
}

function MenuItem({ icon: Icon, label, onClick, color }: {
  icon: any; label: string; onClick: () => void; color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 transition text-left ${color ?? 'text-zinc-700'}`}
    >
      <Icon size={15} className="flex-shrink-0" />
      {label}
    </button>
  )
}
