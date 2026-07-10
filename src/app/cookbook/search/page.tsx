'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Ingredient, Recipe } from '@/lib/types'
import {
  DoshaKey, DOSHA_LABEL, compatibility, compatScore, seasonBonus, imbalanceBonus,
  COMPAT_MARK, COMPAT_LABEL, Compatibility,
} from '@/lib/dosha'
import { CookingPot } from 'lucide-react'
import DoshaBadges from '../DoshaBadges'

const DOSHAS: DoshaKey[] = ['vata', 'pitta', 'kapha']
const SEASONS = ['春', '夏', '秋', '冬']

const MARK_COLOR: Record<Compatibility, string> = {
  excellent: 'bg-emerald-100 text-emerald-700',
  good: 'bg-lime-100 text-lime-700',
  caution: 'bg-amber-100 text-amber-700',
  avoid: 'bg-rose-100 text-rose-600',
}

export default function SearchPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [tab, setTab] = useState<'ingredients' | 'recipes'>('ingredients')

  // 体質（プリセット + 個別）
  const [doshas, setDoshas] = useState<DoshaKey[]>(['kapha', 'pitta'])
  const [season, setSeason] = useState<string | null>(null)
  const [imbalance, setImbalance] = useState<DoshaKey[]>([])
  const [hideAvoid, setHideAvoid] = useState(false)

  useEffect(() => {
    fetch('/api/ingredients').then((r) => r.json()).then((j) => setIngredients(j.data ?? []))
    fetch('/api/recipes').then((r) => r.json()).then((j) => setRecipes(j.data ?? []))
  }, [])

  function toggleDosha(d: DoshaKey) {
    setDoshas((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }
  function toggleImbalance(d: DoshaKey) {
    setImbalance((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const rankedIngredients = useMemo(() => {
    return ingredients
      .map((i) => ({
        item: i,
        compat: compatibility(i, doshas),
        score: compatScore(i, doshas) + seasonBonus(i, season) + imbalanceBonus(i, imbalance),
      }))
      .filter((x) => !hideAvoid || x.compat !== 'avoid')
      .sort((a, b) => b.score - a.score)
  }, [ingredients, doshas, season, imbalance, hideAvoid])

  const rankedRecipes = useMemo(() => {
    return recipes
      .map((r) => ({
        item: r,
        compat: compatibility(r, doshas),
        score: compatScore(r, doshas) + seasonBonus(r, season) + imbalanceBonus(r, imbalance),
      }))
      .filter((x) => !hideAvoid || x.compat !== 'avoid')
      .sort((a, b) => b.score - a.score)
  }, [recipes, doshas, season, imbalance, hideAvoid])

  return (
    <div className="space-y-5">
      <h1 className="text-xl text-[#4a4234]">体質で探す</h1>

      {/* 体質選択 */}
      <div className="rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-4 space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-[#8a7d64]">鎮めたい体質（複数可）</p>
          <div className="flex gap-2">
            {DOSHAS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDosha(d)}
                className={`flex-1 rounded-full py-2 text-sm ${doshas.includes(d) ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#8a7d64]'}`}
              >
                {DOSHA_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-[#8a7d64]">季節（任意・リトチャリア）</p>
          <div className="flex gap-2">
            <button onClick={() => setSeason(null)} className={`rounded-full px-3 py-1.5 text-xs ${season === null ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#8a7d64]'}`}>指定なし</button>
            {SEASONS.map((s) => (
              <button key={s} onClick={() => setSeason(s)} className={`rounded-full px-3 py-1.5 text-xs ${season === s ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#8a7d64]'}`}>{s}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-[#8a7d64]">今の乱れ（任意・特に増えているドーシャ）</p>
          <div className="flex gap-2">
            {DOSHAS.map((d) => (
              <button
                key={d}
                onClick={() => toggleImbalance(d)}
                className={`rounded-full px-3 py-1.5 text-xs ${imbalance.includes(d) ? 'bg-[#c98b6b] text-white' : 'bg-[#efe8da] text-[#8a7d64]'}`}
              >
                {DOSHA_LABEL[d]}過剰
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#8a7d64]">
          <input type="checkbox" checked={hideAvoid} onChange={(e) => setHideAvoid(e.target.checked)} />
          「避けたい」を隠す
        </label>
      </div>

      {/* タブ */}
      <div className="flex rounded-full border border-[#e4ddd0] bg-[#faf7f1] p-1">
        <button onClick={() => setTab('ingredients')} className={`flex-1 rounded-full py-2 text-sm ${tab === 'ingredients' ? 'bg-[#a99878] text-white' : 'text-[#8a7d64]'}`}>食材</button>
        <button onClick={() => setTab('recipes')} className={`flex-1 rounded-full py-2 text-sm ${tab === 'recipes' ? 'bg-[#a99878] text-white' : 'text-[#8a7d64]'}`}>レシピ</button>
      </div>

      {tab === 'ingredients' ? (
        <ul className="space-y-2.5">
          {rankedIngredients.map(({ item, compat }) => (
            <li key={item.id}>
              <Link href={`/cookbook/ingredients/${item.id}`} className="flex items-center gap-3 rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-3 shadow-sm active:scale-[0.99]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${MARK_COLOR[compat]}`}>{COMPAT_MARK[compat]}</span>
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm text-[#4a4234]">{item.name}</span>
                    <span className="shrink-0 text-[11px] text-[#a99878]">{COMPAT_LABEL[compat]}</span>
                  </div>
                  <div className="mt-1"><DoshaBadges vata={item.vata_effect} pitta={item.pitta_effect} kapha={item.kapha_effect} size="sm" /></div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2.5">
          {rankedRecipes.map(({ item, compat }) => (
            <li key={item.id}>
              <Link href={`/cookbook/recipes/${item.id}`} className="flex items-center gap-3 rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-3 shadow-sm active:scale-[0.99]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${MARK_COLOR[compat]}`}>{COMPAT_MARK[compat]}</span>
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#efe8da]"><CookingPot strokeWidth={1.4} className="h-4 w-4 text-[#c0b59f]" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm text-[#4a4234]">{item.name}</span>
                    <span className="shrink-0 text-[11px] text-[#a99878]">{COMPAT_LABEL[compat]}</span>
                  </div>
                  <div className="mt-1"><DoshaBadges vata={item.vata_effect} pitta={item.pitta_effect} kapha={item.kapha_effect} size="sm" /></div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
