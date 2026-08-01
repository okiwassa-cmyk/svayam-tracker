import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AYURVEDA_FOOD_REFERENCE, AYURVEDA_EATING_METHOD } from '@/lib/ayurveda-foods'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const systemPrompt = `あなたはアーユルヴェーダ専門家です。ユーザーの体質：カファ・ピッタ（インドのドクター診断済み）

以下の形式でJSONのみを返してください（他のテキストは不要）：
{
  "description": "料理名と食材（例：ムング豆カレー＋キビご飯、納豆ご飯など）",
  "calories_estimate": 数字のみ（kcal概算）,
  "kapha_score": "excellent" | "good" | "caution" | "avoid",
  "pitta_score": "excellent" | "good" | "caution" | "avoid",
  "rasa": ["甘", "苦"]（この料理に含まれる六味を、強く感じられる順に配列で。使う語は「甘」「酸」「塩」「辛」「苦」「渋」の6つのみ。該当するものを1〜複数）,
  "advice": "一言アドバイス（良ければ褒める、改善点があれば簡潔に）"
}

判定基準：
- excellent（◎）：温かい・軽め・スパイス使用・豆類・野菜中心・ギー少量
- good（○）：調理済み・普通量・白米少量
- caution（△）：乳製品・甘いもの・冷たいもの・量が多い
- avoid（✗）：揚げ物・精製糖・冷たい飲み物・加工食品

【90日実践期間中の個人ルール】この方は以下を避けると自分で決めている：生野菜サラダ、ヨーグルト、揚げ物、冷たい食べ物・飲み物、小麦（うどん・パン・パスタ等。そばはOK）、じゃがいも、トマト、キャベツ。
料理にこれらが含まれる場合、kapha_score・pitta_scoreは"caution"以上にはしない。adviceで、責めるトーンではなく事実として「今日はルール外の◯◯が入ってます」のように具体的に触れる

六味（rasa）の判定：下の対応表に従って機械的に判定してください。印象で決めず、材料が表のどれに当たるかで決めます。過去のデータと同じ基準で集計するため、この表から外れた判断はしないでください。
- 甘：穀物全般（米・大麦・もち麦・雑穀・そば・小麦）、豆・豆腐・納豆、根菜（にんじん・大根・かぶ・芋）、魚・肉・卵、ココナッツ、玉ねぎ（加熱）、乳製品、砂糖類
- 酸：酢・もずく酢・三杯酢、シークヮーサー・レモン、トマト、梅干し、漬物・ピクルス・キムチ、酒粕、ヨーグルト
- 塩：味噌・醤油・塩・塩麹、海藻（わかめ・青さ/アオサ・もずく・ひじき・昆布）、煮干し出し、ナンプラー、佃煮、たくあん
- 辛：生姜、唐辛子・島唐辛子、胡椒、マスタード、和がらし、ニンニク、ネギ、大根（生）、クミン、トリカトゥー
- 苦：葉物野菜（小松菜・ほうれん草・つるむらさき・モロヘイヤ・空芯菜・青梗菜・モリンガ）、ゴーヤ、ターメリック、パクチー、フェヌグリーク
- 渋：豆類・レンズ豆、ブロッコリー、オクラ、キャベツ、ごぼう、きのこ類、こんにゃく、切り干し大根、レンコン、茄子
一皿に複数の味が該当することが普通です。該当するものはすべて挙げてください（漏らさない）。
カファ・ピッタ体質にとっては苦味・渋味が理想、甘味・酸味・塩味の摂りすぎに注意。adviceでは、その食事に**入っていない味**があればどの副菜を足せば補えるかに触れてください。

adviceを書くときは、毎回「生姜・ターメリックを足す」に頼らない。下記の食べ方の知識（六味・食べ合わせ・季節・ピッタ安全なスパイス）から、その料理に合った具体的で幅のある一言を選ぶ。

${AYURVEDA_FOOD_REFERENCE}

${AYURVEDA_EATING_METHOD}`

// テキストだけで判定する。写真を伴わない登録と、あとからテキストを直したときの付け直しで使う
const TEXT_ONLY_RULES = `descriptionはこのテキストに書かれた品だけで構成してください。書かれていない食材・料理・飲み物を足さない、書かれている品を落とさない、料理名を言い換えない。`

type MealAnalysis = {
  description: string
  calories_estimate: number
  kapha_score: string
  pitta_score: string
  rasa: string | null
  advice: string
}

async function analyze(content: Anthropic.MessageParam['content']): Promise<MealAnalysis | null> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content }],
  })
  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  const parsed = JSON.parse(jsonMatch[0])
  return {
    ...parsed,
    rasa: Array.isArray(parsed.rasa)
      ? parsed.rasa.join('・')
      : typeof parsed.rasa === 'string'
        ? parsed.rasa
        : null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null
    const textDescription = formData.get('text_description') as string | null
    const date = formData.get('date') as string
    const mealType = formData.get('meal_type') as string
    const loggedAt = formData.get('logged_at') as string | null
    const skipped = formData.get('skipped') === 'true'
    const hungryBeforeRaw = formData.get('hungry_before') as string | null
    const hungryBefore = hungryBeforeRaw === 'true' ? true : hungryBeforeRaw === 'false' ? false : null

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // Handle skip without AI analysis
    if (skipped) {
      const { data, error } = await supabaseAdmin
        .from('meal_logs')
        .insert({ date, meal_type: mealType || 'breakfast', skipped: true, logged_at: loggedAt || new Date().toISOString() })
        .select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data, analysis: null })
    }

    if (!image && !textDescription) {
      return NextResponse.json({ error: 'image or text_description required' }, { status: 400 })
    }

    let messageContent: Anthropic.MessageParam['content']

    if (image) {
      const arrayBuffer = await image.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      const textHint = textDescription?.trim()
        ? `\n\nユーザーが入力した料理名・食材メモ：「${textDescription.trim()}」\nこのテキストが唯一の正解です。descriptionはこのテキストに書かれた品だけで構成してください。\n- テキストに無い食材・料理・飲み物を足さない（写真に写って見えても足さない）\n- テキストにある品を落とさない\n- テキストと写真が食い違ったらテキストを採用する（例：テキストが「豆腐ハンバーグ」なら「ハンバーグ」にしない、「青さ汁」を「わかめスープ」にしない、「キチディ」を「煮物丼」にしない）\n写真は量やカロリーの見積もりの補助としてのみ使ってください。`
        : '\n\nこの食事写真を分析してください。写真から確実に判別できるものだけを書き、推測で食材を足さないでください。'
      messageContent = [
        { type: 'text', text: `${systemPrompt}${textHint}` },
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      ]
    } else {
      messageContent = `${systemPrompt}\n\n次の食事を分析してください：${textDescription}\n\n${TEXT_ONLY_RULES}`
    }

    const analysis = await analyze(messageContent)
    if (!analysis) {
      return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
    }

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
        rasa: analysis.rasa,
        advice: analysis.advice,
        image_url: imageUrl,
        user_input: textDescription?.trim() || null,
        logged_at: loggedAt || new Date().toISOString(),
        hungry_before: hungryBefore,
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

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {}
  if ('user_note' in body) updates.user_note = body.user_note
  if ('logged_at' in body) updates.logged_at = body.logged_at
  if ('hungry_before' in body) updates.hungry_before = body.hungry_before
  if ('user_input' in body) updates.user_input = body.user_input

  // テキストを直したら六味も付け直す。直したのに古い判定が残ると、
  // 六味の集計がテキストと食い違ったまま積み上がる
  const newText = typeof body.user_input === 'string' ? body.user_input.trim() : ''
  if (newText) {
    const { data: current } = await supabaseAdmin
      .from('meal_logs')
      .select('user_input')
      .eq('id', id)
      .single()

    if (current && current.user_input !== newText) {
      const analysis = await analyze(
        `${systemPrompt}\n\n次の食事を分析してください：${newText}\n\n${TEXT_ONLY_RULES}`
      )
      if (analysis) {
        updates.description = analysis.description
        updates.calories_estimate = analysis.calories_estimate
        updates.kapha_score = analysis.kapha_score
        updates.pitta_score = analysis.pitta_score
        updates.rasa = analysis.rasa
        updates.advice = analysis.advice
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('meal_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
