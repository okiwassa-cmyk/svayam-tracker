import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AYURVEDA_EATING_METHOD } from '@/lib/ayurveda-foods'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

type InIngredient = {
  ingredient_id?: string | null
  name: string
  amount?: string | null
  unit?: string | null
}

// POST /api/recipe-analyze
// { name, ingredients: [{ingredient_id, name, amount, unit}], description?, steps? }
// → 食材事典を集計＋AI補正して、ドーシャ・六味・ヴィーリヤ・季節・アドバイスを返す
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name: string = body.name || ''
    const ingredients: InIngredient[] = Array.isArray(body.ingredients) ? body.ingredients : []
    const description: string = body.description || ''
    const steps: { text: string }[] = Array.isArray(body.steps) ? body.steps : []

    if (ingredients.length === 0) {
      return NextResponse.json({ error: 'ingredients required' }, { status: 400 })
    }

    // 登録済み食材のデータを取得
    const ids = ingredients.map((i) => i.ingredient_id).filter(Boolean) as string[]
    let known: Record<string, {
      name: string; rasa: string[]; virya: string | null
      vata_effect: number; pitta_effect: number; kapha_effect: number
      karma: string | null; caution: string | null
    }> = {}
    if (ids.length > 0) {
      const { data } = await supabaseAdmin
        .from('ingredients')
        .select('id, name, rasa, virya, vata_effect, pitta_effect, kapha_effect, karma, caution')
        .in('id', ids)
      if (data) {
        known = Object.fromEntries(data.map((d) => [d.id, d]))
      }
    }

    // 集計（登録済み食材のドーシャ作用を平均）
    let vSum = 0, pSum = 0, kSum = 0, count = 0
    const rasaSet = new Set<string>()
    const viryaVotes: Record<string, number> = {}
    const cautions: string[] = []
    const knownLines: string[] = []
    const unknownNames: string[] = []

    for (const ing of ingredients) {
      const k = ing.ingredient_id ? known[ing.ingredient_id] : undefined
      if (k) {
        vSum += k.vata_effect; pSum += k.pitta_effect; kSum += k.kapha_effect; count++
        ;(k.rasa || []).forEach((r) => rasaSet.add(r))
        if (k.virya) viryaVotes[k.virya] = (viryaVotes[k.virya] || 0) + 1
        if (k.caution) cautions.push(`${k.name}: ${k.caution}`)
        knownLines.push(
          `- ${k.name}（${ing.amount || ''}${ing.unit || ''}）六味:${(k.rasa || []).join('・') || '?'} / ヴィーリヤ:${k.virya || '?'} / V${k.vata_effect} P${k.pitta_effect} K${k.kapha_effect}${k.karma ? ` / ${k.karma}` : ''}`
        )
      } else {
        unknownNames.push(`${ing.name}（${ing.amount || ''}${ing.unit || ''}）`)
      }
    }

    const round = (n: number): number => (n > 0.34 ? 1 : n < -0.34 ? -1 : 0)
    const aggregate = count > 0
      ? { vata: round(vSum / count), pitta: round(pSum / count), kapha: round(kSum / count) }
      : null
    const topVirya = Object.entries(viryaVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const systemPrompt = `あなたはアーユルヴェーダに詳しい調理師です。
料理全体のドーシャへの作用・六味・ヴィーリヤ（温冷）・向いている季節（リトチャリア）・一言アドバイスをまとめます。

季節（リトチャリア）の考え方：
- 春＝カパが増えやすい → カパを鎮める料理（温・軽・スパイス）が向く
- 夏・初秋＝ピッタが増えやすい → ピッタを鎮める料理（涼・甘苦渋・穏やか）が向く
- 冬＝ヴァータが増えやすい → ヴァータを鎮める料理（温・油・重・甘酸塩）が向く
- 沖縄は亜熱帯で夏が長い前提で、当てはまる季節を複数選んでよい
- 料理のヴィーリヤ（温冷）と、どのドーシャを鎮めるかで判断する

必ず以下の形式でJSONのみを返す（他のテキスト不要）：
{
  "vata_effect": -1 | 0 | 1,
  "pitta_effect": -1 | 0 | 1,
  "kapha_effect": -1 | 0 | 1,
  "rasa": ["六味を強い順に。甘酸塩辛苦渋のみ"],
  "virya": "温性 | 熱性 | 冷性 | 中性",
  "season": ["春","夏","秋","冬" から向くものを複数可"],
  "advice": "この料理の一言アドバイス（体質・季節の観点で。生姜ターメリックに頼りすぎない）"
}

集計データは参考値です。調理法（煮る・蒸す・揚げる・生）や分量バランスを踏まえて補正してください。

${AYURVEDA_EATING_METHOD}`

    const userMsg = `料理名：${name || '（未設定）'}
${description ? `説明：${description}\n` : ''}
【登録済み食材（事典データ）】
${knownLines.join('\n') || 'なし'}

${unknownNames.length ? `【事典に未登録の食材】\n${unknownNames.join('\n')}\n` : ''}
${steps.length ? `【作り方】\n${steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}\n` : ''}
【集計値（登録済み食材の平均）】
${aggregate ? `V${aggregate.vata} P${aggregate.pitta} K${aggregate.kapha} / ヴィーリヤ多数決:${topVirya || '?'} / 六味:${[...rasaSet].join('・') || '?'}` : '登録済み食材なし（食材名から推定してください）'}

この料理を分析してください。`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }
    const analysis = JSON.parse(jsonMatch[0])
    if (!Array.isArray(analysis.rasa)) analysis.rasa = analysis.rasa ? [analysis.rasa] : []
    if (!Array.isArray(analysis.season)) analysis.season = analysis.season ? [analysis.season] : []

    return NextResponse.json({
      analysis,
      aggregate,      // 集計の生値（参考表示用）
      cautions,       // 材料由来の注意
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
