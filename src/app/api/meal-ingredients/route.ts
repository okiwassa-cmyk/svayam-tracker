import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { matchIngredients, type MatchableIngredient } from '@/lib/match-ingredients'

// GET /api/meal-ingredients?date=YYYY-MM-DD
// その日の食事テキストに出てくる食材を、食材事典（cookbook）と突き合わせて返す。
// 毎日ドーシャ作用を目にするための表示なので、判定はせず事典の値をそのまま渡す
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  const [mealsRes, ingRes] = await Promise.all([
    supabaseAdmin.from('meal_logs').select('id, user_input, description').eq('date', date),
    supabaseAdmin
      .from('ingredients')
      .select('id, name, aliases, vata_effect, pitta_effect, kapha_effect'),
  ])
  if (mealsRes.error) return NextResponse.json({ error: mealsRes.error.message }, { status: 500 })
  if (ingRes.error) return NextResponse.json({ error: ingRes.error.message }, { status: 500 })

  const ingredients = (ingRes.data ?? []) as MatchableIngredient[]
  const byMeal: Record<string, MatchableIngredient[]> = {}
  for (const m of mealsRes.data ?? []) {
    const text = m.user_input?.trim() || m.description
    if (!text) continue
    byMeal[m.id as string] = matchIngredients(text, ingredients)
  }

  return NextResponse.json({ byMeal })
}
