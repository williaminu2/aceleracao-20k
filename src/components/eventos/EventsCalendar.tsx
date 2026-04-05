'use client'

import { useEffect, useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { X, MapPin, Video, Calendar, Clock, Plus, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Event {
  id: string
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  location: string | null
  online: boolean
  meeting_url: string | null
  cover_url: string | null
  rsvp_count?: number
  my_rsvp?: boolean
}

const EVENT_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'
]

function hashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length]
}

export function EventsCalendar() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const calendarRef = useRef<any>(null)

  // Form criar evento
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', end_date: '',
    location: '', online: true, meeting_url: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data } = await supabase
      .from('events')
      .select(`id, title, description, event_date, end_date, location, online, meeting_url, cover_url,
        event_rsvps (user_id)`)
      .order('event_date')

    if (data) {
      setEvents(data.map((e: any) => ({
        ...e,
        rsvp_count: e.event_rsvps?.length ?? 0,
        my_rsvp: e.event_rsvps?.some((r: any) => r.user_id === user?.id) ?? false,
      })))
    }
  }

  async function handleRsvp(event: Event) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setRsvpLoading(true)

    if (event.my_rsvp) {
      await supabase.from('event_rsvps').delete()
        .eq('event_id', event.id).eq('user_id', user.id)
    } else {
      await supabase.from('event_rsvps').insert({ event_id: event.id, user_id: user.id })
    }

    await loadEvents()
    const updated = events.find(e => e.id === event.id)
    if (updated) setSelectedEvent({ ...updated, my_rsvp: !event.my_rsvp })
    setRsvpLoading(false)
  }

  async function handleCreate() {
    if (!form.title || !form.event_date || creating) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('events').insert({
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      end_date: form.end_date || null,
      location: form.location || null,
      online: form.online,
      meeting_url: form.meeting_url || null,
      created_by: user?.id,
    })

    await loadEvents()
    setForm({ title: '', description: '', event_date: '', end_date: '', location: '', online: true, meeting_url: '' })
    setShowCreateModal(false)
    setCreating(false)
  }

  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.event_date,
    end: e.end_date || undefined,
    backgroundColor: hashColor(e.title),
    borderColor: hashColor(e.title),
  }))

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Botão criar evento */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
        >
          <Plus size={15} />
          Criar evento
        </button>
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 [&_.fc-button]:bg-white [&_.fc-button]:border-zinc-200 [&_.fc-button]:text-zinc-700 [&_.fc-button]:shadow-none [&_.fc-button:hover]:bg-zinc-100 [&_.fc-button-primary]:bg-white [&_.fc-button-primary]:border-zinc-200 [&_.fc-button-primary]:text-zinc-700 [&_.fc-button-active]:!bg-orange-500 [&_.fc-button-active]:!border-orange-500 [&_.fc-button-active]:!text-white [&_.fc-today-button]:bg-white [&_.fc-today-button]:border-zinc-200 [&_.fc-today-button]:text-zinc-700 [&_.fc-toolbar-title]:text-base [&_.fc-toolbar-title]:font-bold [&_.fc-toolbar-title]:text-zinc-900 [&_.fc-col-header-cell]:text-xs [&_.fc-col-header-cell]:font-semibold [&_.fc-col-header-cell]:text-zinc-500 [&_.fc-daygrid-day-number]:text-sm [&_.fc-daygrid-day-number]:text-zinc-600 [&_.fc-day-today]:!bg-orange-50 [&_.fc-event]:cursor-pointer [&_.fc-event]:rounded-md [&_.fc-event-title]:text-xs [&_.fc-event-title]:font-medium">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'listWeek,timeGridWeek,dayGridMonth',
          }}
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' }}
          events={calendarEvents}
          eventClick={(info) => {
            const ev = events.find(e => e.id === info.event.id)
            if (ev) setSelectedEvent(ev)
          }}
          height="auto"
          dayMaxEvents={3}
        />
      </div>

      {/* Modal detalhe do evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Botão fechar flutuante */}
            <div className="relative">
              {/* Cover */}
              {selectedEvent.cover_url ? (
                <img src={selectedEvent.cover_url} alt={selectedEvent.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44" style={{ background: `linear-gradient(135deg, ${hashColor(selectedEvent.title)}, ${hashColor(selectedEvent.title)}88)` }} />
              )}
              <button onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 rounded-full transition">
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Título */}
              <h2 className="font-bold text-zinc-900 text-base leading-tight">{selectedEvent.title}</h2>

              {/* Horário e data */}
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-zinc-400" />
                  <span>
                    {formatTime(selectedEvent.event_date)}
                    {selectedEvent.end_date && ` - ${formatTime(selectedEvent.end_date)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-zinc-400" />
                  <span>{new Date(selectedEvent.event_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Link da reunião */}
              {selectedEvent.meeting_url && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 min-w-0">
                    <Video size={13} className="text-blue-500 flex-shrink-0" />
                    <a href={selectedEvent.meeting_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 text-xs truncate hover:underline flex-1">
                      {selectedEvent.meeting_url}
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(selectedEvent.meeting_url!)}
                      className="p-1 hover:bg-zinc-200 rounded transition flex-shrink-0">
                      <ExternalLink size={12} className="text-zinc-400" />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-green-600 border border-green-300 bg-green-50 px-2 py-1 rounded-lg flex-shrink-0">
                    Gratuito
                  </span>
                </div>
              )}

              {/* Descrição */}
              {selectedEvent.description && (
                <div>
                  <p className="text-xs font-bold text-zinc-900 mb-1">Descrição</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {/* Convidados */}
              <div className="flex items-center justify-between py-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <span>👥</span>
                  <span>{selectedEvent.rsvp_count} convidados</span>
                </div>
                <button className="p-1 hover:bg-zinc-100 rounded-lg transition">
                  <span className="text-zinc-400 text-xs">👁</span>
                </button>
              </div>

              {/* Botão registrar */}
              <button
                onClick={() => handleRsvp(selectedEvent)}
                disabled={rsvpLoading}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                  selectedEvent.my_rsvp
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                {rsvpLoading && <Loader2 size={13} className="animate-spin" />}
                {selectedEvent.my_rsvp ? 'Cancelar inscrição' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-zinc-900 text-base">Criar evento</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-zinc-100 rounded-lg transition">
                <X size={18} className="text-zinc-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Título *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nome do evento"
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Início *</label>
                  <input type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Fim</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, online: true }))}
                  className={`flex-1 py-2 text-sm rounded-xl border transition font-medium ${form.online ? 'bg-orange-500 text-white border-orange-500' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  Online
                </button>
                <button onClick={() => setForm(f => ({ ...f, online: false }))}
                  className={`flex-1 py-2 text-sm rounded-xl border transition font-medium ${!form.online ? 'bg-orange-500 text-white border-orange-500' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  Presencial
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">{form.online ? 'Link da reunião' : 'Endereço'}</label>
                <input type="text" value={form.online ? form.meeting_url : form.location}
                  onChange={e => form.online ? setForm(f => ({ ...f, meeting_url: e.target.value })) : setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={form.online ? 'https://meet.google.com/...' : 'Rua, número, cidade'}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={!form.title || !form.event_date || creating}
                className="flex-1 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {creating && <Loader2 size={14} className="animate-spin" />}
                Criar evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
