import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const RASA_ALL = ['甘', '酸', '塩', '辛', '苦', '渋']

const MEAL_LABEL: Record<string, string> = {
  breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
}

// GET /api/rasa-suggest?date=YYYY-MM-DD
// 六味は「1食の中にそろっているか」で見る。食事ごとの充足状況だけを返す。
// 記録は食後なので、その食事に足す提案は間に合わない。何を足すかは本人が決める
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  const { data: rows, error } = await supabaseAdmin
    .from('meal_logs')
    .select('meal_type, description, user_input, rasa')
    .eq('date', date)
    .order('logged_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const meals = (rows ?? [])
    .map((m) => {
      const menu = m.user_input?.trim() || m.description
      const tastes = (m.rasa ?? '').split('・').map((s: string) => s.trim())
      const got = RASA_ALL.filter((r) => tastes.includes(r))
      return {
        meal_type: m.meal_type as string,
        label: MEAL_LABEL[m.meal_type as string] ?? (m.meal_type as string),
        menu,
        got,
        missing: RASA_ALL.filter((r) => !got.includes(r)),
      }
    })
    .filter((m) => m.menu)

  return NextResponse.json({ meals })
}
