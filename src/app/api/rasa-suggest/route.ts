import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AYURVEDA_FOOD_REFERENCE } from '@/lib/ayurveda-foods'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const RASA_ALL = ['甘', '酸', '塩', '辛', '苦', '渋']

// GET /api/rasa-suggest?date=YYYY-MM-DD
// その日の食事から六味の充足を集計し、足りない味を補える一品を提案する
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  const { data: rows, error } = await supabaseAdmin
    .from('meal_logs')
    .select('meal_type, description, rasa')
    .eq('date', date)
    .order('logged_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const meals = (rows ?? []).filter((m) => m.description)

  const got = new Set<string>()
  for (const m of meals) {
    for (const r of (m.rasa ?? '').split('・')) {
      const t = r.trim()
      if (RASA_ALL.includes(t)) got.add(t)
    }
  }
  const missing = RASA_ALL.filter((r) => !got.has(r))
  const eaten = RASA_ALL.filter((r) => got.has(r))

  if (missing.length === 0 || meals.length === 0) {
    return NextResponse.json({ got: eaten, missing, dishes: [] })
  }

  const MEAL_LABEL: Record<string, string> = {
    breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
  }
  const todayMenu = meals
    .map((m) => `・${MEAL_LABEL[m.meal_type as string] ?? m.meal_type}：${m.description ?? ''}（${m.rasa ?? '味の記録なし'}）`)
    .join('\n')

  const prompt = `あなたはアーユルヴェーダに詳しい料理人です。ユーザーの体質はカファ・ピッタ。沖縄在住の調理師で、和食が中心です。

今日ここまでの食事：
${todayMenu}

足りていない味（六味）：${missing.join('・')}

この食事に「足す」かたちで、足りない味を補える一品を提案してください。
条件：
- 上の献立に自然に添えられる、手のかからない一品（副菜・薬味・汁もの・食前の一口など）
- 沖縄や日本で手に入る食材で。カファ・ピッタなので温かい・軽いものを優先し、重い・冷たいものは避ける
- 足りない味が2つ以上あるときは、1品でまとめて補えるならまとめる。無理なら最大2品まで
- 料理名は具体的に（「酸味のもの」ではなく「大根とシークヮーサーの酢の物」のように）
- 【90日実践期間中の個人ルール・最優先】以下は提案に使わない：生野菜サラダ、ヨーグルト、揚げ物、冷たい食べ物・飲み物、小麦（うどん・パン・パスタ・チャパティ等。そばはOK）、じゃがいも、トマト、キャベツ。下のリファレンス表に載っていてもこのルールを優先する

JSONのみを返す（他のテキスト不要）：
{
  "dishes": [
    { "name": "料理名", "tastes": ["酸"], "note": "作り方や添え方を一言で（30字以内）" }
  ]
}

${AYURVEDA_FOOD_REFERENCE}`

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    const dishes = match ? (JSON.parse(match[0]).dishes ?? []) : []
    return NextResponse.json({ got: eaten, missing, dishes })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ got: eaten, missing, dishes: [] })
  }
}
