import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null
    const date = formData.get('date') as string
    const mealType = formData.get('meal_type') as string

    if (!image || !date) {
      return NextResponse.json({ error: 'image and date are required' }, { status: 400 })
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const prompt = `あなたはアーユルヴェーダ専門家です。この食事写真を分析してください。
ユーザーの体質：カファ・ピッタ（インドのドクター診断済み）

以下の形式でJSONのみを返してください（他のテキストは不要）：
{
  "description": "料理名と食材（例：ムング豆カレー＋キビご飯、納豆ご飯など）",
  "calories_estimate": 数字のみ（kcal概算）,
  "kapha_score": "excellent" | "good" | "caution" | "avoid",
  "pitta_score": "excellent" | "good" | "caution" | "avoid",
  "advice": "一言アドバイス（良ければ褒める、改善点があれば簡潔に）"
}

判定基準：
- excellent（◎）：温かい・軽め・スパイス使用・豆類・野菜中心・ギー少量
- good（○）：調理済み・普通量・白米少量
- caution（△）：乳製品・甘いもの・冷たいもの・量が多い
- avoid（✗）：揚げ物・精製糖・冷たい飲み物・加工食品`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Save to Supabase
    const { data, error } = await supabaseAdmin
      .from('meal_logs')
      .insert({
        date,
        meal_type: mealType || 'snack',
        description: analysis.description,
        calories_estimate: analysis.calories_estimate,
        kapha_score: analysis.kapha_score,
        pitta_score: analysis.pitta_score,
        advice: analysis.advice,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, analysis })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('meal_logs')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
