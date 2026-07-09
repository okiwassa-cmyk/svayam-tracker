import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AYURVEDA_FOOD_REFERENCE, AYURVEDA_EATING_METHOD } from '@/lib/ayurveda-foods'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

const SYSTEM_PROMPT = `あなたはアーユルヴェーダ専門の食事アドバイザーです。
ユーザーの体質：カファ・ピッタ（インドのドクター診断済み）

【カファ・ピッタ体質の食事原則】
- 温かく・軽め・スパイシーな食事が理想（カファ軽減）
- 過度に辛いものは避ける（ピッタ刺激に注意）
- 推奨食材は下記リファレンスの穀物・豆・スパイス・葉野菜から幅広く選ぶ
- 避けるもの：乳製品・精製糖・冷たい飲み物・揚げ物・夜7時以降の食事
- 昼食を最も大きく、朝夕は軽めに
- 木曜日はファスティングデー

【提案するときの大事なルール】
- 毎回「生姜・ターメリック」に頼らないこと。クミン・コリアンダー・フェンネル・カルダモン・黒胡椒など、リファレンスのスパイスを日替わりでローテーションする
- 穀物や豆もムング豆一択にせず、大麦・雑穀・レンズ豆・そばなど変化をつける
- 六味（甘酸塩辛苦渋）のバランスで提案を組み立て、その日の体調・季節・すでに食べたものを踏まえて毎回違う具体案を出す
- 同じ食材ばかり繰り返していると感じたら、意識的に別の食材・調理法（スープ・蒸し・煮込み・テンパリング）を提案する

【会話スタイル】
- 日本語で答える
- 親しみやすく、具体的に
- 食材名や料理名は日本語で
- 長すぎず、要点を絞って回答
- 量の目安も伝える

食材のドーシャ作用を答えるときは、下記リファレンスを優先する。

${AYURVEDA_FOOD_REFERENCE}

${AYURVEDA_EATING_METHOD}

今日食べた食事のコンテキストがあれば、それを踏まえてアドバイスする。`

export async function POST(req: NextRequest) {
  try {
    const { messages, todayMeals } = await req.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Build context from today's meals
    let mealContext = ''
    if (todayMeals && todayMeals.length > 0) {
      mealContext = '\n\n【今日すでに食べたもの】\n' + todayMeals.map((m: { meal_type: string; description: string; kapha_score: string }) =>
        `- ${m.meal_type}: ${m.description}（カファ評価: ${m.kapha_score}）`
      ).join('\n')
    }

    const systemWithContext = SYSTEM_PROMPT + mealContext

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemWithContext,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
