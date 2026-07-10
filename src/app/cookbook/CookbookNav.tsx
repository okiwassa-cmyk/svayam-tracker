'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/cookbook', label: 'ホーム', match: (p: string) => p === '/cookbook' },
  { href: '/cookbook/ingredients', label: '食材事典', match: (p: string) => p.startsWith('/cookbook/ingredients') },
  { href: '/cookbook/recipes', label: 'レシピ', match: (p: string) => p.startsWith('/cookbook/recipes') },
  { href: '/cookbook/search', label: '体質で探す', match: (p: string) => p.startsWith('/cookbook/search') },
]

export default function CookbookNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#e4ddd0] bg-[#faf7f1]/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {items.map((it) => {
          const active = it.match(pathname)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex-1 py-3 text-center text-xs tracking-wide transition-colors ${
                active ? 'text-[#6b5d45] font-medium' : 'text-[#b3a892]'
              }`}
            >
              <span className={active ? 'border-b border-[#a99878] pb-1' : ''}>{it.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
