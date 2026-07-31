'use client'

import Link from 'next/link'
import { effectArrow, effectColor } from '@/lib/dosha'
import type { MatchedIngredient } from '@/lib/match-ingredients'

// 食材事典に載っている食材だけを、カパ・ピッタへの作用つきで並べる。
// ヴァータは体質外なので出さない（毎日見て覚えるための表示なので短く保つ）
export default function IngredientDosha({ items }: { items: MatchedIngredient[] }) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {items.map((ing) => (
        <Link
          key={ing.id}
          href={`/cookbook/ingredients/${ing.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs active:bg-stone-100"
        >
          <span className="text-stone-600">
            {ing.name}
            {ing.matched_as && <span className="text-stone-400">（{ing.matched_as}）</span>}
          </span>
          <span className="text-stone-400">K</span>
          <span className={effectColor(ing.kapha_effect)}>{effectArrow(ing.kapha_effect)}</span>
          <span className="text-stone-400">P</span>
          <span className={effectColor(ing.pitta_effect)}>{effectArrow(ing.pitta_effect)}</span>
        </Link>
      ))}
    </div>
  )
}
