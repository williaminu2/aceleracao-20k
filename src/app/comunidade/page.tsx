'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { Header } from '@/components/layout/Header'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { CreatePost } from '@/components/posts/CreatePost'
import { FeaturedPosts } from '@/components/posts/FeaturedPosts'
import { PostCard, Post } from '@/components/posts/PostCard'
import { CourseList, Course } from '@/components/aprendizado/CourseList'
import { CourseDetail } from '@/components/aprendizado/CourseDetail'
import { LessonPlayer } from '@/components/aprendizado/LessonPlayer'
import { EventsCalendar } from '@/components/eventos/EventsCalendar'
import { Leaderboard } from '@/components/leaderboard/Leaderboard'
import { Members } from '@/components/membros/Members'
import { NextEventBanner } from '@/components/layout/NextEventBanner'
import { Chat } from '@/components/chat/Chat'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface SelectedLesson {
  id: string
  title: string
  video_url: string | null
  thumbnail_url?: string | null
  duration_minutes: number
  courseTitle: string
  moduleTitle: string
}

export default function ComunidadePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeChannel, setActiveChannel] = useState('inicio')
  const [activeChannelLabel, setActiveChannelLabel] = useState('')
  const [activeChannelAdminOnly, setActiveChannelAdminOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('Discussão')
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<SelectedLesson | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const loadPosts = useCallback(async (channelLabel?: string) => {
    if (!user) return
    setPostsLoading(true)

    let query = supabase
      .from('posts')
      .select(`
        id, channel, content, pinned, created_at,
        profiles (id, full_name, avatar_url, level),
        likes (user_id),
        comments (id)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (channelLabel) {
      query = query.eq('channel', channelLabel)
    }

    const { data } = await query

    if (data) {
      const mapped: Post[] = data.map((p: any) => ({
        id: p.id,
        author: p.profiles?.full_name || 'Membro',
        authorId: p.profiles?.id || null,
        authorAvatar: p.profiles?.avatar_url || null,
        authorLevel: p.profiles?.level || 0,
        channel: p.channel,
        content: p.content,
        likes: p.likes?.length ?? 0,
        comments: p.comments?.length ?? 0,
        createdAt: p.created_at,
        pinned: p.pinned,
        likedByMe: p.likes?.some((l: any) => l.user_id === user.id) ?? false,
      }))
      setPosts(mapped)
    }

    setPostsLoading(false)
  }, [user])

  useEffect(() => {
    if (user) loadPosts(activeChannelLabel || undefined)
  }, [user, activeChannelLabel])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  async function handleChannelChange(id: string) {
    setActiveChannel(id)
    if (id === 'inicio') {
      setActiveChannelLabel('')
      setActiveChannelAdminOnly(false)
    } else {
      const { data } = await supabase
        .from('channels').select('label, admin_only').eq('id', id).single()
      setActiveChannelLabel(data?.label || '')
      setActiveChannelAdminOnly(data?.admin_only || false)
    }
  }

  const currentUser = {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Membro',
    avatar: user.user_metadata?.avatar_url || null,
  }

  const showRightSidebar = activeTab === 'Discussão'

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100">
      <LeftSidebar activeChannel={activeChannel} onChannelChange={handleChannelChange} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setSelectedLesson(null); setSelectedCourse(null) }}
          currentUser={currentUser}
        />
        <NextEventBanner onNavigateEvents={() => { setActiveTab('Eventos'); setSelectedLesson(null); setSelectedCourse(null) }} />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">

            {/* Aba Discussão */}
            {activeTab === 'Discussão' && (
              <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
                <CreatePost
                  currentUser={currentUser}
                  channel={activeChannelLabel || 'Discussão'}
                  adminOnly={activeChannelAdminOnly}
                  onPost={() => loadPosts(activeChannelLabel || undefined)}
                />
                <FeaturedPosts />
                {postsLoading ? (
                  <div className="flex justify-center py-10">
                    <span className="w-6 h-6 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 text-sm">
                    Nenhuma publicação ainda. Seja o primeiro a postar!
                  </div>
                ) : (
                  posts.map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            )}

            {/* Aba Aprendizado */}
            {activeTab === 'Aprendizado' && (
              <div className="max-w-4xl mx-auto py-6 px-4">
                {selectedLesson && selectedCourse ? (
                  <LessonPlayer
                    lesson={selectedLesson}
                    course={selectedCourse}
                    onBack={() => setSelectedLesson(null)}
                    onSelectLesson={(lesson) => setSelectedLesson({ ...lesson, video_url: lesson.video_url ?? null, thumbnail_url: lesson.thumbnail_url ?? null })}
                    onComplete={() => {}}
                  />
                ) : selectedCourse ? (
                  <CourseDetail
                    course={selectedCourse}
                    onBack={() => setSelectedCourse(null)}
                    onSelectLesson={(lesson) => setSelectedLesson({ ...lesson, video_url: lesson.video_url ?? null, thumbnail_url: lesson.thumbnail_url ?? null })}
                  />
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-zinc-900 mb-5">Aprendizado</h2>
                    <CourseList onSelectCourse={setSelectedCourse} />
                  </>
                )}
              </div>
            )}

            {/* Aba Eventos */}
            {activeTab === 'Eventos' && (
              <div className="max-w-5xl mx-auto py-6 px-4">
                <EventsCalendar />
              </div>
            )}

            {/* Aba Tabela de classificação */}
            {activeTab === 'Tabela de classificação' && (
              <div className="max-w-5xl mx-auto py-6 px-4">
                <Leaderboard />
              </div>
            )}

            {/* Aba Membros */}
            {activeTab === 'Membros' && (
              <div className="flex gap-5 max-w-5xl mx-auto py-6 px-4 w-full items-start">
                <div className="flex-1 min-w-0">
                  <Members />
                </div>
                <RightSidebar />
              </div>
            )}

            {/* Aba Chat */}
            {activeTab === 'Chat' && (
              <div className="h-full p-4">
                <Chat />
              </div>
            )}

          </main>

          {activeTab === 'Discussão' && <RightSidebar />}
        </div>
      </div>
    </div>
  )
}
