'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, FileText, Users, ArrowLeft, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/escritorio/propostas', label: 'Propostas', icon: FileText },
  { href: '/escritorio/clientes', label: 'Clientes', icon: Users },
]

export default function EscritorioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setUserName(data?.full_name?.split(' ')[0] || ''))
    })
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200"
        style={{ width: collapsed ? 64 : 220, background: '#1a2e4a' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Escritório</p>
              <p className="text-blue-300 text-xs truncate">Projetar BIM</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-white/50 hover:text-white transition flex-shrink-0"
          >
            <ChevronLeft size={15} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Welcome */}
        {!collapsed && userName && (
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white/40 text-[10px] uppercase tracking-wide">Bem-vindo(a),</p>
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {!collapsed && (
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-2 mb-2">Menu</p>
          )}
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-blue-600 text-white' : 'text-white/65 hover:text-white hover:bg-white/10'
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* Back */}
        <div className="p-3 border-t border-white/10">
          <Link
            href="/comunidade"
            className="flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white text-xs rounded-lg hover:bg-white/10 transition"
            title={collapsed ? 'Voltar à comunidade' : undefined}
          >
            <ArrowLeft size={14} className="flex-shrink-0" />
            {!collapsed && 'Voltar à comunidade'}
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
