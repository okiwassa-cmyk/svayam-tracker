'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'ホーム', emoji: '🏠' },
  { href: '/habits', label: '習慣', emoji: '✅' },
  { href: '/meal', label: '食事', emoji: '🍽' },
  { href: '/dashboard', label: 'グラフ', emoji: '📊' },
  { href: '/guide', label: 'ガイド', emoji: '🌿' },
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
            <span className="text-xl">{item.emoji}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
