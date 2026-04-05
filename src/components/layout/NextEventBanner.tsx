'use client'

import { useEffect, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NextEvent {
  id: string
  title: string
  event_date: string
}

interface NextEventBannerProps {
  onNavigateEvents?: () => void
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'acontecendo agora'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `em ${days} dia${days !== 1 ? 's' : ''}`
  if (hours > 0) return `em ${hours} hora${hours !== 1 ? 's' : ''}`
  return `em ${mins} minuto${mins !== 1 ? 's' : ''}`
}

export function NextEventBanner({ onNavigateEvents }: NextEventBannerProps) {
  const [event, setEvent] = useState<NextEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(1)
        .single()
      if (data) {
        setEvent(data)
        setTimeLabel(timeUntil(data.event_date))
      }
    }
    load()
  }, [])

  // Atualizar o tempo a cada minuto
  useEffect(() => {
    if (!event) return
    const interval = setInterval(() => setTimeLabel(timeUntil(event.event_date)), 60000)
    return () => clearInterval(interval)
  }, [event])

  if (!event || dismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
      <Calendar size={14} className="text-amber-600 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-800">
        <button
          onClick={onNavigateEvents}
          className="font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition"
        >
          {event.title}
        </button>
        {' '}
        <span>está acontecendo {timeLabel}</span>
      </p>
      <button onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-100 rounded transition flex-shrink-0">
        <X size={13} className="text-amber-500" />
      </button>
    </div>
  )
}
