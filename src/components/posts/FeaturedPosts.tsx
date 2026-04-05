'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { PostCard, Post } from './PostCard'

const FEATURED: Post[] = [
  {
    id: 'f1',
    author: 'Gabriele Lopes Pires',
    authorLevel: 3,
    channel: 'RECADOS IMPORTANTES',
    content: '📣 Suporte aos alunos\n\nSe precisar de ajuda, envie mensagem para qualquer um dos números abaixo. Nossa equipe de suporte estará à disposição para ajudar.',
    likes: 15,
    comments: 0,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    pinned: true,
  },
  {
    id: 'f2',
    author: 'William Alves',
    authorLevel: 8,
    channel: 'RECADOS IMPORTANTES',
    content: '🚀 Boas-vindas ao Programa de Aceleração 20K!\n\nEstamos felizes em tê-los aqui. Aproveitem ao máximo os conteúdos e a comunidade!',
    likes: 42,
    comments: 5,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    pinned: true,
  },
]

export function FeaturedPosts() {
  const [index, setIndex] = useState(0)

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-zinc-900">Em destaque</h3>
        <Info size={13} className="text-zinc-400" />
        <div className="flex-1" />
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition"
        >
          <ChevronLeft size={16} className="text-zinc-500" />
        </button>
        <button
          onClick={() => setIndex(Math.min(FEATURED.length - 1, index + 1))}
          disabled={index === FEATURED.length - 1}
          className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition"
        >
          <ChevronRight size={16} className="text-zinc-500" />
        </button>
      </div>
      <PostCard post={FEATURED[index]} featured />
    </div>
  )
}
