'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function CookbookHome() {
  const [counts, setCounts] = useState<{ ingredients: number; recipes: number }>({ ingredients: 0, recipes: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/ingredients').then((r) => r.json()),
      fetch('/api/recipes').then((r) => r.json()),
    ]).then(([ing, rec]) => {
      setCounts({
        ingredients: ing.data?.length ?? 0,
        recipes: rec.data?.length ?? 0,
      })
    })
  }, [])

  return (
    <div className="space-y-8">
      <header className="pt-4 text-center">
        <div className="mb-3 text-2xl text-[#a99878]">🌿</div>
        <h1 className="text-2xl tracking-wide text-[#4a4234]">Svayam レシピブック</h1>
        <p className="mt-2 text-sm text-[#8a7d64]">アーユルヴェーダの食材と、毎日のごはん</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/cookbook/ingredients"
          className="rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-5 shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="text-3xl">📖</div>
          <div className="mt-3 text-base text-[#4a4234]">食材事典</div>
          <div className="mt-1 text-xs text-[#a99878]">{counts.ingredients} 品</div>
        </Link>
        <Link
          href="/cookbook/recipes"
          className="rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-5 shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="text-3xl">🍲</div>
          <div className="mt-3 text-base text-[#4a4234]">レシピ</div>
          <div className="mt-1 text-xs text-[#a99878]">{counts.recipes} 品</div>
        </Link>
      </div>

      <Link
        href="/cookbook/search"
        className="block rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-5 shadow-sm transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className="text-3xl">☯️</div>
          <div>
            <div className="text-base text-[#4a4234]">体質で探す</div>
            <div className="mt-1 text-xs text-[#8a7d64]">ドーシャ・季節・体調から逆引き</div>
          </div>
        </div>
      </Link>

      <div className="flex gap-3">
        <Link
          href="/cookbook/ingredients/new"
          className="flex-1 rounded-full border border-[#d8cdb8] bg-[#efe8da] py-3 text-center text-sm text-[#6b5d45] active:scale-[0.98]"
        >
          ＋ 食材を登録
        </Link>
        <Link
          href="/cookbook/recipes/new"
          className="flex-1 rounded-full border border-[#d8cdb8] bg-[#efe8da] py-3 text-center text-sm text-[#6b5d45] active:scale-[0.98]"
        >
          ＋ レシピを登録
        </Link>
      </div>
    </div>
  )
}
