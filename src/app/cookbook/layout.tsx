import type { Metadata } from 'next'
import CookbookNav from './CookbookNav'

export const metadata: Metadata = {
  title: 'Svayam レシピブック',
  description: 'アーユルヴェーダの食材事典とレシピ',
  manifest: '/cookbook-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'レシピブック' },
  icons: { apple: '/icons/cookbook-apple.png' },
}

export const viewport = {
  themeColor: '#f4efe6',
}

export default function CookbookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-full bg-[#f4efe6] text-[#4a4234]"
      style={{ fontFamily: 'var(--font-mincho), serif' }}
    >
      <div className="mx-auto max-w-lg overflow-x-hidden px-5 pb-24 pt-6">{children}</div>
      <CookbookNav />
    </div>
  )
}
