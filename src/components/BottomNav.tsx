'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'ホーム', icon: '/icons/sun.png' },
  { href: '/habits', label: '習慣', icon: '/icons/habits.png' },
  { href: '/meal', label: '食事', icon: '/icons/meal.png' },
  { href: '/timeline', label: 'ルーティン', icon: '/icons/clock.png' },
  { href: '/dashboard', label: 'グラフ', icon: '/icons/chart.png' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex">
      {navItems.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              active ? 'text-green-700 font-semibold' : 'text-stone-400'
            }`}
          >
            <Image
              src={item.icon}
              alt={item.label}
              width={24}
              height={24}
              className={active ? 'opacity-100' : 'opacity-30'}
              style={{ filter: active ? 'invert(27%) sepia(60%) saturate(600%) hue-rotate(94deg) brightness(90%)' : 'none' }}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
