'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Recipe } from '@/lib/types'
import { effectArrow, effectColor } from '@/lib/dosha'
import CardExport from '../../../CardExport'

export default function RecipeCardPage() {
  const { id } = useParams<{ id: string }>()
  const [r, setR] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/recipes?id=${id}`)
      .then((res) => res.json())
      .then((j) => setR(j.data ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="py-10 text-center text-sm text-[#a99878]">読み込み中…</p>
  if (!r) return <p className="py-10 text-center text-sm text-[#a99878]">見つかりませんでした</p>

  return (
    <div className="space-y-5 pb-4">
      <Link href={`/cookbook/recipes/${id}`} className="text-xs text-[#a99878]">← {r.name}</Link>
      <h1 className="text-lg text-[#4a4234]">noteカード</h1>

      <CardExport filename={`recipe-${r.name}`}>
        <div className="relative overflow-hidden bg-[#f4efe6]" style={{ fontFamily: 'var(--font-mincho), serif', color: '#4a4234' }}>
          {r.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.photo_url} alt="" className="h-56 w-full object-cover" crossOrigin="anonymous" />
          )}
          <div className="relative p-8">
            <div className="absolute inset-3 border border-[#d8cdb8]" style={{ top: r.photo_url ? '-0.75rem' : '0.75rem' }} />
            <div className="relative">
              <div className="text-center text-xl text-[#a99878]">🌿</div>
              <div className="mt-2 text-center text-3xl tracking-wide">{r.name}</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[#8a7d64]">
                {r.category && <span>{r.category}</span>}
                {r.servings && <span>· {r.servings}人前</span>}
                {r.cook_time && <span>· {r.cook_time}分</span>}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                {r.virya && <span className="rounded-full bg-[#efe3c4] px-3 py-1">{r.virya}</span>}
                {r.rasa?.length > 0 && <span>{r.rasa.join('・')}</span>}
              </div>
              <div className="mt-3 flex justify-center gap-3">
                {(['vata', 'pitta', 'kapha'] as const).map((d) => {
                  const label = { vata: 'ヴァータ', pitta: 'ピッタ', kapha: 'カパ' }[d]
                  const e = r[`${d}_effect` as const]
                  return (
                    <span key={d} className="rounded-lg border border-[#e4ddd0] bg-[#faf7f1] px-3 py-1.5 text-xs">
                      <span className="text-[#a99878]">{label}</span>
                      <span className={`ml-1 ${effectColor(e)}`}>{effectArrow(e)}</span>
                    </span>
                  )
                })}
              </div>

              {r.season?.length > 0 && (
                <div className="mt-3 flex justify-center gap-2">
                  {r.season.map((s) => <span key={s} className="rounded-full bg-[#efe8da] px-3 py-1 text-xs text-[#8a7d64]">{s}</span>)}
                </div>
              )}

              {r.ingredients?.length > 0 && (
                <div className="mt-5">
                  <div className="text-center text-xs text-[#a99878]">材料</div>
                  <div className="mt-1.5 text-center text-sm leading-relaxed text-[#6b5d45]">
                    {r.ingredients.map((i) => i.name).join('・')}
                  </div>
                </div>
              )}

              {r.advice && <p className="mt-4 text-center text-sm leading-relaxed text-[#6b5d45]">{r.advice}</p>}

              <div className="mt-6 text-center text-[11px] tracking-widest text-[#b3a892]">
                Svayam レシピブック
              </div>
            </div>
          </div>
        </div>
      </CardExport>
    </div>
  )
}
