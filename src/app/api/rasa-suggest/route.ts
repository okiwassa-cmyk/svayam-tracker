import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const RASA_ALL = ['甘', '酸', '塩', '辛', '苦', '渋']

// GET /api/rasa-suggest?date=YYYY-MM-DD
// その日の食事記録から六味の充足を集計し、足りない味を補える食材を食材事典から返す
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  const { data: meals, error } = await supabaseAdmin
    .from('meal_logs')
    .select('rasa')
    .eq('date', date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const got = new Set<string>()
  for (const m of meals ?? []) {
    for (const r of (m.rasa ?? '').split('・')) {
      const t = r.trim()
      if (RASA_ALL.includes(t)) got.add(t)
    }
  }
  const missing = RASA_ALL.filter((r) => !got.has(r))

  const suggestions: Record<string, string[]> = {}
  for (const taste of missing) {
    const { data } = await supabaseAdmin
      .from('ingredients')
      .select('name')
      .contains('rasa', [taste])
      .order('favorite', { ascending: false })
      .order('name', { ascending: true })
      .limit(5)
    suggestions[taste] = (data ?? []).map((i) => i.name as string)
  }

  return NextResponse.json({
    got: RASA_ALL.filter((r) => got.has(r)),
    missing,
    suggestions,
  })
}
