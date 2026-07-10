'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Recipe } from '@/lib/types'
import RecipeForm from '../../RecipeForm'

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/recipes?id=${id}`)
      .then((r) => r.json())
      .then((j) => setItem(j.data ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="py-10 text-center text-sm text-[#a99878]">読み込み中…</p>
  if (!item) return <p className="py-10 text-center text-sm text-[#a99878]">見つかりませんでした</p>
  return <RecipeForm initial={item} />
}
