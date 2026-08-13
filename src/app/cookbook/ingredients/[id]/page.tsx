'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CookingPot } from 'lucide-react'
import type { Ingredient, Recipe } from '@/lib/types'
import DoshaBadges from '../../DoshaBadges'

export default function IngredientDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<Ingredient | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/ingredients?id=${id}`)
      .then((r) => r.json())
      .then((j) => setItem(j.data ?? null))
      .finally(() => setLoading(false))
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((j) => {
        const all: Recipe[] = j.data ?? []
        setRecipes(all.filter((r) => (r.ingredients ?? []).some((ri) => ri.ingredient_id === id)))
      })
  }, [id])

  async function del() {
    if (!confirm(`「${item?.name}」を削除しますか？`)) return
    await fetch(`/api/ingredients?id=${id}`, { method: 'DELETE' })
    router.push('/cookbook/ingredients')
  }

  if (loading) return <p className="py-10 text-center text-sm text-[#7d6d4c]">読み込み中…</p>
  if (!item) return <p className="py-10 text-center text-sm text-[#7d6d4c]">見つかりませんでした</p>

  return (
    <div className="space-y-5 pb-4">
      <Link href="/cookbook/ingredients" className="text-xs text-[#7d6d4c]">← 食材事典</Link>

      {item.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photo_url} alt={item.name} className="h-48 w-full rounded-2xl object-cover shadow-sm" />
      )}

      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl text-[#4a4234]">{item.name}</h1>
          {item.category && <span className="text-xs text-[#7d6d4c]">{item.category}</span>}
        </div>
        {item.sanskrit && <p className="mt-0.5 text-sm italic text-[#7d6d4c]">{item.sanskrit}</p>}
        {item.aliases && <p className="mt-0.5 text-sm text-[#61543c]">{item.aliases}</p>}
        <div className="mt-1 flex items-center gap-2">
          <SourceBadge source={item.source} />
        </div>
      </div>

      {/* サマリー */}
      <div className="rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-4 shadow-sm">
        <p className="mb-2 text-xs text-[#7d6d4c]">アーユルヴェーダ</p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6b5d45]">
            {item.virya && <Tag>ヴィールヤ：{item.virya}</Tag>}
            {item.rasa?.length > 0 && <Tag>ラサ：{item.rasa.join('・')}</Tag>}
            {item.guna && <Tag>グナ：{item.guna}</Tag>}
          </div>
          <DoshaBadges vata={item.vata_effect} pitta={item.pitta_effect} kapha={item.kapha_effect} />
        </div>
        {item.karma && <p className="mt-2 text-sm leading-relaxed text-[#6b5d45]">薬効：{item.karma}</p>}
        {!item.karma && !item.guna && !item.virya && (!item.rasa || item.rasa.length === 0) && (
          <p className="mt-2 text-xs text-[#a99878]">アーユルヴェーダの記録なし（古典的根拠が確認できていません）</p>
        )}
      </div>

      {(item.tcm_nature || item.tcm_taste || item.tcm_meridian || item.tcm_effect) && (
        <Section title="東洋医学・薬膳">
          <div className="flex flex-wrap gap-2 text-xs text-[#6b5d45]">
            {item.tcm_nature && <Tag>四気：{item.tcm_nature}</Tag>}
            {item.tcm_taste && <Tag>五味：{item.tcm_taste}</Tag>}
            {item.tcm_meridian && <Tag>帰経：{item.tcm_meridian}</Tag>}
          </div>
          {item.tcm_effect && <p className="mt-2 text-sm text-[#6b5d45]">{item.tcm_effect}</p>}
        </Section>
      )}

      {item.folklore && (
        <Section title="伝承・民間知">
          {item.folklore_region?.length > 0 && (
            <div className="mb-1.5 flex gap-1.5">
              {item.folklore_region.map((r) => <Tag key={r}>{r}</Tag>)}
            </div>
          )}
          <p className="text-sm leading-relaxed text-[#6b5d45]">{item.folklore}</p>
        </Section>
      )}

      {(item.nutrition || item.energy_kcal !== null) && (
        <Section title="現代栄養データ">
          {item.nutrition && <p className="text-sm leading-relaxed text-[#6b5d45]">{item.nutrition}</p>}
          {item.energy_kcal !== null && (
            <div className="mt-2 rounded-xl border border-[#e4ddd0] bg-[#faf7f1] p-3">
              <p className="mb-2 text-[11px] text-[#7d6d4c]">{item.nutrient_basis || '可食部100gあたり'}</p>
              <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-xs text-[#4a4234]">
                <NutrientCell label="エネルギー" value={item.energy_kcal} unit="kcal" />
                <NutrientCell label="たんぱく質" value={item.protein_g} unit="g" />
                <NutrientCell label="脂質" value={item.fat_g} unit="g" />
                <NutrientCell label="炭水化物" value={item.carb_g} unit="g" />
                <NutrientCell label="食物繊維" value={item.fiber_g} unit="g" />
                <NutrientCell label="カルシウム" value={item.calcium_mg} unit="mg" />
                <NutrientCell label="鉄" value={item.iron_mg} unit="mg" />
                <NutrientCell label="ビタミンC" value={item.vitamin_c_mg} unit="mg" />
                <NutrientCell label="ビタミンA" value={item.vitamin_a_ug} unit="μg" />
                <NutrientCell label="カリウム" value={item.potassium_mg} unit="mg" />
                <NutrientCell label="ナトリウム" value={item.sodium_mg} unit="mg" />
              </div>
              {item.nutrient_source && (
                <p className="mt-2 text-[11px] text-[#a99878]">出典：{item.nutrient_source}</p>
              )}
            </div>
          )}
        </Section>
      )}

      {item.caution && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs text-rose-400">注意</p>
          <p className="mt-1 text-sm leading-relaxed text-rose-700">{item.caution}</p>
        </div>
      )}

      {item.note && <p className="text-sm text-[#61543c]">{item.note}</p>}

      {recipes.length > 0 && (
        <Section title="この食材を使うレシピ">
          <ul className="space-y-2">
            {recipes.map((r) => (
              <li key={r.id}>
                <Link href={`/cookbook/recipes/${r.id}`} className="flex items-center gap-3 rounded-xl border border-[#e4ddd0] bg-[#faf7f1] p-2.5 text-sm text-[#4a4234]">
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#efe8da]"><CookingPot strokeWidth={1.4} className="h-4 w-4 text-[#c0b59f]" /></span>
                  )}
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href={`/cookbook/ingredients/${id}/edit`}
          className="flex-1 rounded-full border border-[#d8cdb8] bg-[#efe8da] py-3 text-center text-sm text-[#6b5d45]"
        >
          編集
        </Link>
        <Link
          href={`/cookbook/ingredients/${id}/card`}
          className="flex-1 rounded-full border border-[#c9b98f] bg-[#efe3c4] py-3 text-center text-sm text-[#6b5d45]"
        >
          noteカード
        </Link>
      </div>
      <button onClick={del} className="w-full py-2 text-center text-xs text-rose-400">削除</button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-sm text-[#7d6d4c]">{title}</h2>
      {children}
    </div>
  )
}

function NutrientCell({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value === null) return null
  return (
    <div>
      <span className="text-[#7d6d4c]">{label}</span>
      <span className="ml-1">{value}{unit}</span>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#efe8da] px-2.5 py-0.5 text-xs text-[#61543c]">{children}</span>
}

function SourceBadge({ source }: { source: string }) {
  const isAI = source === '推定(AI)'
  const isPrimary = source === '一次ソース'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] ${
        isPrimary ? 'bg-emerald-100 text-emerald-700' : isAI ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
      }`}
    >
      {source}
    </span>
  )
}
