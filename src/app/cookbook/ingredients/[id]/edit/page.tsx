'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Ingredient } from '@/lib/types'
import IngredientForm from '../../IngredientForm'

export default function EditIngredientPage() {
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

  if (loading) return <p className="py-10 text-center text-sm text-[#7d6d4c]">読み込み中…</p>
  if (!item) return <p className="py-10 text-center text-sm text-[#7d6d4c]">見つかりませんでした</p>
  return <IngredientForm initial={item} />
}
