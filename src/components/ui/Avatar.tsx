'use client'

import { getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  level?: number
  onClick?: () => void
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ name, src, size = 'md', level, onClick }: AvatarProps) {
  return (
    <div
      className={`relative inline-block flex-shrink-0 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0`}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-orange-500 flex items-center justify-center font-semibold text-white">
            {getInitials(name)}
          </div>
        )}
      </div>
      {level !== undefined && (
        <span className="absolute -bottom-0.5 -right-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
          {level}
        </span>
      )}
    </div>
  )
}
