'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  profiles: Profile | null
}

interface Conversation {
  otherId: string
  otherName: string
  otherAvatar: string | null
  lastMessage: string
  lastAt: string
  unread: number
}

export function Chat() {
  const [myId, setMyId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    const { data: profile } = await supabase
      .from('profiles').select('id, full_name, avatar_url').eq('id', user.id).single()
    if (profile) setMyProfile(profile as Profile)

    const { data: all } = await supabase
      .from('profiles').select('id, full_name, avatar_url')
      .neq('id', user.id).order('full_name')
    if (all) setMembers(all as Profile[])

    loadConversations(user.id)
  }

  async function loadConversations(uid: string) {
    const { data } = await supabase
      .from('direct_messages')
      .select('id, content, created_at, sender_id, receiver_id, read, profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    if (!data) return

    const map = new Map<string, Conversation>()
    for (const m of data as any[]) {
      const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id
      if (map.has(otherId)) continue
      const otherProfile = members.find(p => p.id === otherId)
      map.set(otherId, {
        otherId,
        otherName: otherProfile?.full_name || m.profiles?.full_name || 'Membro',
        otherAvatar: otherProfile?.avatar_url ?? m.profiles?.avatar_url ?? null,
        lastMessage: m.content,
        lastAt: m.created_at,
        unread: (!m.read && m.receiver_id === uid) ? 1 : 0,
      })
    }
    setConversations(Array.from(map.values()))
  }

  async function selectConversation(otherId: string) {
    setSelectedId(otherId)
    const prof = members.find(p => p.id === otherId) ?? null
    setSelectedProfile(prof)
    loadMessages(otherId)
  }

  async function loadMessages(otherId: string) {
    if (!myId) return
    setLoadingMessages(true)
    const { data } = await supabase
      .from('direct_messages')
      .select('id, content, created_at, sender_id, profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url)')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true })
    if (data) setMessages(data as any)

    // Marcar como lido
    await supabase.from('direct_messages')
      .update({ read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', myId)

    setLoadingMessages(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // Real-time subscription
  useEffect(() => {
    if (!myId || !selectedId) return
    const channel = supabase
      .channel(`dm-${myId}-${selectedId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `receiver_id=eq.${myId}`,
      }, async (payload) => {
        if (payload.new.sender_id !== selectedId) return
        const { data: senderProfile } = await supabase
          .from('profiles').select('id, full_name, avatar_url').eq('id', payload.new.sender_id).single()
        setMessages(prev => [...prev, {
          ...payload.new as any,
          profiles: senderProfile,
        }])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myId, selectedId])

  async function handleSend() {
    if (!text.trim() || !myId || !selectedId || sending) return
    setSending(true)
    const { data } = await supabase.from('direct_messages').insert({
      sender_id: myId,
      receiver_id: selectedId,
      content: text.trim(),
      read: false,
    }).select('id, content, created_at, sender_id').single()

    if (data) {
      setMessages(prev => [...prev, { ...data, profiles: myProfile }])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
    setText('')
    setSending(false)
    if (myId) loadConversations(myId)
  }

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const listItems: { id: string; name: string; avatar: string | null; sub: string }[] = search
    ? filteredMembers.map(m => ({ id: m.id, name: m.full_name || 'Membro', avatar: m.avatar_url, sub: 'Iniciar conversa' }))
    : conversations.map(c => ({ id: c.otherId, name: c.otherName, avatar: c.otherAvatar, sub: c.lastMessage }))

  return (
    <div className="flex h-full bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Lista de conversas */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-100 flex flex-col">
        <div className="p-3 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-sm mb-3">Mensagens</h2>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar membro..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-100 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listItems.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-10">Nenhum membro encontrado</p>
          ) : listItems.map(item => (
            <button key={item.id} onClick={() => selectConversation(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 border-b border-zinc-50 transition text-left ${
                selectedId === item.id ? 'bg-orange-50' : 'hover:bg-zinc-50'
              }`}>
              <Avatar name={item.name} src={item.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-900 truncate">{item.name}</p>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center">
              <Send size={28} className="text-orange-300" />
            </div>
            <p className="text-sm font-medium">Selecione um membro para conversar</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 flex-shrink-0">
              <Avatar name={selectedProfile?.full_name || 'Membro'} src={selectedProfile?.avatar_url} size="sm" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">{selectedProfile?.full_name || 'Membro'}</p>
                <p className="text-[11px] text-green-500">Online</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center pt-10">
                  <span className="w-6 h-6 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                  <p className="text-sm">Nenhuma mensagem ainda.</p>
                  <p className="text-xs">Seja o primeiro a dizer olá!</p>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.sender_id === myId
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar
                      name={isMe ? (myProfile?.full_name || 'Eu') : (msg.profiles?.full_name || 'Membro')}
                      src={isMe ? myProfile?.avatar_url : msg.profiles?.avatar_url}
                      size="sm"
                    />
                    <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-orange-500 text-white rounded-tr-sm'
                          : 'bg-zinc-100 text-zinc-800 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-zinc-400 px-1">{timeAgo(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-zinc-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 px-4 py-2.5 text-sm bg-zinc-100 rounded-full outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
