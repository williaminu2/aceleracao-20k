'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, LogOut, ShieldCheck, Settings } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SearchModal } from './SearchModal'
import { NotificationsPopup } from './NotificationsPopup'

const tabs = ['Discussão', 'Aprendizado', 'Eventos', 'Tabela de classificação', 'Membros', 'Chat']

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
  currentUser: { name: string; avatar?: string | null }
  onOpenSearch?: () => void
}

export function Header({ activeTab, onTabChange, currentUser, onOpenSearch }: HeaderProps) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUserInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setIsAdmin(data?.role === 'admin')
    }
    loadUserInfo()
  }, [])

  useEffect(() => {
    async function loadUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnreadCount(count ?? 0)
    }
    loadUnread()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Atalho ⌘K / Ctrl+K para abrir busca
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <header className="bg-white border-b border-zinc-200 flex-shrink-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-100">
        <h1 className="text-base font-semibold text-zinc-900">Programa de Aceleração 20K</h1>

        <div className="flex items-center gap-2 flex-1 max-w-sm mx-8">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2 pl-3 pr-4 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-full transition text-left"
          >
            <Search size={14} className="text-zinc-400 flex-shrink-0" />
            <span className="text-zinc-400">Pesquisar...</span>
            <span className="ml-auto text-[10px] text-zinc-400 border border-zinc-300 px-1.5 py-0.5 rounded hidden sm:block">⌘K</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              title="Painel Admin"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-semibold rounded-full transition"
            >
              <ShieldCheck size={13} />
              Admin
            </button>
          )}

          <div className="relative" ref={bellRef}>
            <button
              onClick={() => { setShowNotifications(v => !v); setShowDropdown(false) }}
              className="relative p-2 rounded-full hover:bg-zinc-100 transition"
            >
              <Bell size={18} className="text-zinc-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationsPopup
                onClose={() => { setShowNotifications(false); setUnreadCount(0) }}
              />
            )}
          </div>

          {/* Avatar + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(v => !v)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            >
              <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden">
                {/* User info */}
                <div className="p-4 flex flex-col items-center gap-3 border-b border-zinc-100">
                  <div className="relative">
                    <Avatar name={currentUser.name} src={currentUser.avatar} size="lg" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-zinc-900 text-sm leading-tight">
                      Olá, {currentUser.name}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{userEmail}</p>
                  </div>
                  <button
                    onClick={() => { setShowDropdown(false); router.push('/perfil') }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition"
                  >
                    <Settings size={14} />
                    Gerencie sua conta
                  </button>
                </div>

                {/* Sign out */}
                <button
                  onClick={() => { setShowDropdown(false); signOut() }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-red-500 hover:bg-red-50 transition font-medium"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search modal */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onNavigate={(tab) => { onTabChange(tab); setShowSearch(false) }}
        />
      )}
    </header>
  )
}
