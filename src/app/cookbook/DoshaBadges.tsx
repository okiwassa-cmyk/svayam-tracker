'use client'

import type { DoshaEffect } from '@/lib/types'
import { effectArrow, effectColor } from '@/lib/dosha'

type Props = {
  vata: DoshaEffect | number | null
  pitta: DoshaEffect | number | null
  kapha: DoshaEffect | number | null
  size?: 'sm' | 'md'
}

const ROWS: { key: 'vata' | 'pitta' | 'kapha'; label: string }[] = [
  { key: 'vata', label: 'V' },
  { key: 'pitta', label: 'P' },
  { key: 'kapha', label: 'K' },
]

export default function DoshaBadges({ vata, pitta, kapha, size = 'md' }: Props) {
  const map = { vata, pitta, kapha }
  const text = size === 'sm' ? 'text-[11px]' : 'text-sm'
  return (
    <div className="flex gap-1.5">
      {ROWS.map(({ key, label }) => {
        const e = map[key]
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-0.5 rounded-full border border-[#e4ddd0] bg-[#faf7f1] px-2 py-0.5 ${text}`}
          >
            <span className="text-[#a99878]">{label}</span>
            <span className={effectColor(e)}>{effectArrow(e)}</span>
          </span>
        )
      })}
    </div>
  )
}
