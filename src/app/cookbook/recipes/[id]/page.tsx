'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Recipe } from '@/lib/types'
import DoshaBadges from '../../DoshaBadges'

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [r, setR] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/recipes?id=${id}`)
      .then((res) => res.json())
      .then((j) => setR(j.data ?? null))
      .finally(() => setLoading(false))
  }, [id])

  async function del() {
    if (!confirm(`「${r?.name}」を削除しますか？`)) return
    await fetch(`/api/recipes?id=${id}`, { method: 'DELETE' })
    router.push('/cookbook/recipes')
  }

  if (loading) return <p className="py-10 text-center text-sm text-[#a99878]">読み込み中…</p>
  if (!r) return <p className="py-10 text-center text-sm text-[#a99878]">見つかりませんでした</p>

  return (
    <div className="space-y-5 pb-4">
      <Link href="/cookbook/recipes" className="text-xs text-[#a99878]">← レシピ</Link>

      {r.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.photo_url} alt={r.name} className="h-52 w-full rounded-2xl object-cover shadow-sm" />
      )}

      <div>
        <h1 className="text-2xl text-[#4a4234]">{r.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#a99878]">
          {r.category && <span>{r.category}</span>}
          {r.servings && <span>· {r.servings}人前</span>}
          {r.cook_time && <span>· {r.cook_time}分</span>}
          {r.difficulty && <span>· {r.difficulty}</span>}
        </div>
        {r.description && <p className="mt-2 text-sm leading-relaxed text-[#6b5d45]">{r.description}</p>}
      </div>

      {/* ドーシャ・季節 */}
      <div className="rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#6b5d45]">
            {r.virya && <span className="rounded-full bg-[#efe3c4] px-2.5 py-0.5 text-xs">{r.virya}</span>}
            {r.rasa?.length > 0 && <span className="text-xs">{r.rasa.join('・')}</span>}
          </div>
          <DoshaBadges vata={r.vata_effect} pitta={r.pitta_effect} kapha={r.kapha_effect} />
        </div>
        {r.season?.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {r.season.map((s) => <span key={s} className="rounded-full bg-[#efe8da] px-2.5 py-0.5 text-xs text-[#8a7d64]">{s}</span>)}
          </div>
        )}
        {r.advice && <p className="mt-2 text-sm leading-relaxed text-[#6b5d45]">{r.advice}</p>}
      </div>

      {/* 材料 */}
      {r.ingredients?.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm text-[#a99878]">材料{r.servings ? `（${r.servings}人前）` : ''}</h2>
          <ul className="divide-y divide-[#eee6d8] rounded-2xl border border-[#e4ddd0] bg-[#faf7f1]">
            {r.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                {ing.ingredient_id ? (
                  <Link href={`/cookbook/ingredients/${ing.ingredient_id}`} className="text-[#6b5d45] underline decoration-[#d8cdb8] underline-offset-2">
                    {ing.name}
                  </Link>
                ) : (
                  <span className="text-[#6b5d45]">{ing.name}</span>
                )}
                <span className="text-[#a99878]">{ing.amount}{ing.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 手順 */}
      {r.steps?.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm text-[#a99878]">作り方</h2>
          <ol className="space-y-3">
            {r.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a99878] text-xs text-white">{i + 1}</span>
                <p className="pt-0.5 text-sm leading-relaxed text-[#6b5d45]">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Link href={`/cookbook/recipes/${id}/edit`} className="flex-1 rounded-full border border-[#d8cdb8] bg-[#efe8da] py-3 text-center text-sm text-[#6b5d45]">編集</Link>
        <Link href={`/cookbook/recipes/${id}/card`} className="flex-1 rounded-full border border-[#c9b98f] bg-[#efe3c4] py-3 text-center text-sm text-[#6b5d45]">noteカード</Link>
      </div>
      <button onClick={del} className="w-full py-2 text-center text-xs text-rose-400">削除</button>
    </div>
  )
}
