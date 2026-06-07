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
    const textDescription = formData.get('text_description') as string | null
    const date = formData.get('date') as string
    const mealType = formData.get('meal_type') as string

    if ((!image && !textDescription) || !date) {
      return NextResponse.json({ error: 'image or text_description and date are required' }, { status: 400 })
    }

    const systemPrompt = `あなたはアーユルヴェーダ専門家です。ユーザーの体質：カファ・ピッタ（インドのドクター診断済み）

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

    let messageContent: Anthropic.MessageParam['content']

    if (image) {
      const arrayBuffer = await image.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: `${systemPrompt}\n\nこの食事写真を分析してください。` },
      ]
    } else {
      messageContent = `${systemPrompt}\n\n次の食事を分析してください：${textDescription}`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: messageContent }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Upload image to Supabase Storage if provided
    let imageUrl: string | null = null
    if (image) {
      const arrayBuffer2 = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer2)
      const ext = image.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
      const filename = `${date}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabaseAdmin.storage
        .from('meal-photos')
        .upload(filename, buffer, { contentType: image.type, upsert: false })
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from('meal-photos')
          .getPublicUrl(filename)
        imageUrl = urlData.publicUrl
      }
    }

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
        image_url: imageUrl,
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
  const history = searchParams.get('history') // "true" to fetch last 30 days

  if (history === 'true') {
    const { data, error } = await supabaseAdmin
      .from('meal_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

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

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('meal_logs')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
