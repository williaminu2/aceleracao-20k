'use client'

import { useState, useEffect } from 'react'
import {
  Megaphone, Hash, UserCircle, Link2, Bot, HelpCircle, Zap,
  BarChart2, Trophy, Briefcase, Cpu, AlertCircle, Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const ICON_MAP: Record<string, any> = {
  Megaphone, Hash, UserCircle, Link2, Bot, HelpCircle, Zap,
  BarChart2, Trophy, Briefcase, Cpu, AlertCircle, Home,
}

interface Channel {
  id: string
  label: string
  icon: string
  order_index: number
  badge?: number
}

interface LeftSidebarProps {
  activeChannel: string
  onChannelChange: (id: string) => void
}

export function LeftSidebar({ activeChannel, onChannelChange }: LeftSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [postCounts, setPostCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    loadChannels()
  }, [])

  async function loadChannels() {
    const { data } = await supabase
      .from('channels')
      .select('id, label, icon, order_index')
      .order('order_index')

    if (data) setChannels(data)

    // Conta posts por canal (últimos 30 dias)
    const { data: counts } = await supabase
      .from('posts')
      .select('channel')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    if (counts) {
      const map: Record<string, number> = {}
      counts.forEach((p: any) => {
        map[p.channel] = (map[p.channel] || 0) + 1
      })
      setPostCounts(map)
    }
  }

  return (
    <>
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col h-full overflow-y-auto flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-orange-500 font-black text-sm leading-tight text-center">20K</span>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 leading-tight">Programa de</p>
              <p className="text-xs font-bold text-orange-500 leading-tight">Aceleração 20K</p>
            </div>
          </div>
        </div>

        {/* Canais */}
        <nav className="flex-1 py-2">
          {/* Página inicial */}
          <button
            onClick={() => onChannelChange('inicio')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg mx-1 transition-colors',
              activeChannel === 'inicio'
                ? 'bg-orange-500 text-white font-semibold'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            )}
            style={{ width: 'calc(100% - 8px)' }}
          >
            <Home size={16} className="flex-shrink-0" />
            <span className="flex-1 text-left">Página inicial</span>
          </button>

          {channels.map((channel) => {
            const Icon = ICON_MAP[channel.icon] || Hash
            const isActive = activeChannel === channel.id
            const count = postCounts[channel.label] || 0

            return (
              <button
                key={channel.id}
                onClick={() => onChannelChange(channel.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg mx-1 transition-colors',
                  isActive
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">{channel.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
