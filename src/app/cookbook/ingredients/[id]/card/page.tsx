'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Ingredient } from '@/lib/types'
import { effectArrow, effectColor } from '@/lib/dosha'
import CardExport from '../../../CardExport'

export default function IngredientCardPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Ingredient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/ingredients?id=${id}`)
      .then((r) => r.json())
      .then((j) => setItem(j.data ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="py-10 text-center text-sm text-[#a99878]">読み込み中…</p>
  if (!item) return <p className="py-10 text-center text-sm text-[#a99878]">見つかりませんでした</p>

  return (
    <div className="space-y-5 pb-4">
      <Link href={`/cookbook/ingredients/${id}`} className="text-xs text-[#a99878]">← {item.name}</Link>
      <h1 className="text-lg text-[#4a4234]">noteカード</h1>

      <CardExport filename={`ingredient-${item.name}`}>
        <div
          className="relative overflow-hidden bg-[#f4efe6] p-8"
          style={{ fontFamily: 'var(--font-mincho), serif', color: '#4a4234' }}
        >
          {/* ヘアライン枠 */}
          <div className="absolute inset-3 border border-[#d8cdb8]" />
          <div className="relative">
            <div className="text-center text-2xl text-[#a99878]">🌿</div>
            <div className="mt-3 text-center">
              <div className="text-3xl tracking-wide">{item.name}</div>
              {item.aliases && <div className="mt-1 text-sm text-[#8a7d64]">{item.aliases}</div>}
            </div>

            {item.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo_url} alt="" className="mx-auto mt-4 h-40 w-40 rounded-full object-cover" crossOrigin="anonymous" />
            )}

            {/* 六味・温冷・ドーシャ */}
            <div className="mt-5 flex items-center justify-center gap-3 text-sm">
              {item.virya && <span className="rounded-full bg-[#efe3c4] px-3 py-1">{item.virya}</span>}
              {item.rasa?.length > 0 && <span>{item.rasa.join('・')}</span>}
            </div>
            <div className="mt-3 flex justify-center gap-3">
              {(['vata', 'pitta', 'kapha'] as const).map((d) => {
                const label = { vata: 'ヴァータ', pitta: 'ピッタ', kapha: 'カパ' }[d]
                const e = item[`${d}_effect` as const]
                return (
                  <span key={d} className="rounded-lg border border-[#e4ddd0] bg-[#faf7f1] px-3 py-1.5 text-center text-xs">
                    <span className="text-[#a99878]">{label}</span>
                    <span className={`ml-1 ${effectColor(e)}`}>{effectArrow(e)}</span>
                  </span>
                )
              })}
            </div>

            {/* 多層効能 */}
            <div className="mt-5 space-y-3 text-sm leading-relaxed">
              {item.karma && <Row label="アーユルヴェーダ" text={item.karma} />}
              {item.tcm_effect && (
                <Row
                  label="薬膳"
                  text={[item.tcm_nature && `四気:${item.tcm_nature}`, item.tcm_meridian && `帰経:${item.tcm_meridian}`, item.tcm_effect].filter(Boolean).join(' ／ ')}
                />
              )}
              {item.folklore && (
                <Row
                  label={item.folklore_region?.length ? item.folklore_region.join('・') + 'の伝承' : '伝承'}
                  text={item.folklore}
                />
              )}
              {item.nutrition && <Row label="栄養" text={item.nutrition} />}
            </div>

            {item.caution && (
              <p className="mt-4 text-center text-xs text-rose-500">⚠️ {item.caution}</p>
            )}

            <div className="mt-6 text-center text-[11px] tracking-widest text-[#b3a892]">
              Svayam レシピブック ・ 食材事典
            </div>
          </div>
        </div>
      </CardExport>
    </div>
  )
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-xs text-[#a99878]">{label}</div>
      <div className="text-[#4a4234]">{text}</div>
    </div>
  )
}
