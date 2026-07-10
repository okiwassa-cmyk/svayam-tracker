'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CookingPot } from 'lucide-react'
import type { Recipe } from '@/lib/types'
import DoshaBadges from '../DoshaBadges'

export default function RecipesPage() {
  const [items, setItems] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((j) => setItems(j.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[],
    [items]
  )
  const filtered = useMemo(
    () => items.filter((i) => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase()))),
    [items, q, cat]
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-[#4a4234]">レシピ</h1>
        <Link href="/cookbook/recipes/new" className="rounded-full border border-[#d8cdb8] bg-[#efe8da] px-4 py-1.5 text-sm text-[#6b5d45]">
          ＋ 登録
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="レシピを検索…"
        className="w-full rounded-full border border-[#e4ddd0] bg-[#faf7f1] px-4 py-2.5 text-sm outline-none placeholder:text-[#c0b59f]"
      />

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat('')} className={`rounded-full px-3 py-1 text-xs ${cat === '' ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#8a7d64]'}`}>すべて</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-xs ${cat === c ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#8a7d64]'}`}>{c}</button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-[#a99878]">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#a99878]">レシピがありません</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/cookbook/recipes/${r.id}`}
              className="overflow-hidden rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] shadow-sm active:scale-[0.99]"
            >
              {r.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo_url} alt={r.name} className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-[#efe8da]"><CookingPot strokeWidth={1.3} className="h-8 w-8 text-[#c0b59f]" /></div>
              )}
              <div className="p-3">
                <div className="truncate text-sm text-[#4a4234]">{r.name}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-[#a99878]">
                  {r.virya && <span>{r.virya}</span>}
                  {r.season?.length > 0 && <span>· {r.season.join('')}</span>}
                </div>
                <div className="mt-1.5">
                  <DoshaBadges vata={r.vata_effect} pitta={r.pitta_effect} kapha={r.kapha_effect} size="sm" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
