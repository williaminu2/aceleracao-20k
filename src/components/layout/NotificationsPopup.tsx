'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, MessageCircle, ThumbsUp, TrendingUp, UserCheck, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'level_approved' | 'level_rejected' | 'welcome' | 'new_member'
  title: string
  body: string
  read: boolean
  created_at: string
  actor_name?: string
  actor_avatar?: string | null
}

interface NotificationsPopupProps {
  onClose: () => void
}

const TYPE_ICON: Record<string, any> = {
  like: ThumbsUp,
  comment: MessageCircle,
  level_approved: TrendingUp,
  level_rejected: X,
  welcome: Bell,
  new_member: UserCheck,
}

const TYPE_COLOR: Record<string, string> = {
  like: 'bg-orange-50 text-orange-500',
  comment: 'bg-blue-50 text-blue-500',
  level_approved: 'bg-green-50 text-green-500',
  level_rejected: 'bg-red-50 text-red-500',
  welcome: 'bg-purple-50 text-purple-500',
  new_member: 'bg-zinc-50 text-zinc-500',
}

export function NotificationsPopup({ onClose }: NotificationsPopupProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) setNotifications(data as Notification[])
    setLoading(false)
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div ref={ref} className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-zinc-900 text-sm">Notificações</h3>
          {unread > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium transition"
          >
            <CheckCheck size={13} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="w-6 h-6 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
            <Bell size={32} className="opacity-20" />
            <p className="text-sm">Nenhuma notificação ainda</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = TYPE_ICON[n.type] || Bell
            const colorClass = TYPE_COLOR[n.type] || 'bg-zinc-50 text-zinc-500'
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full flex gap-3 px-4 py-3 border-b border-zinc-50 text-left transition hover:bg-zinc-50 ${
                  !n.read ? 'bg-orange-50/40' : ''
                }`}
              >
                {n.actor_name ? (
                  <Avatar name={n.actor_name} src={n.actor_avatar} size="sm" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 leading-tight">{n.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
