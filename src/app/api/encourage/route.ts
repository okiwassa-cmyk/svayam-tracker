import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { keyScore, weight, calories, energy, excellentMeals, totalMeals, dayNumber } = await req.json()

  const scoreText = keyScore ? `${keyScore.done}/${keyScore.total}` : '?'
  const mealText = totalMeals > 0 ? `食事${totalMeals}食中${excellentMeals}食が優良` : '食事未記録'

  const prompt = `あなたはアーユルヴェーダの師（グル）です。カファ・ピッタ体質の弟子が90日間の実験に取り組んでいます。

今日の状況：
- 習慣達成：${scoreText}項目
- 体重：${weight ? weight + 'kg' : '未記録'}
- カロリー：${calories ? calories + 'kcal' : '未記録'}
- エネルギー：${energy ? energy + '/10' : '未記録'}
- ${mealText}
- 実験${dayNumber ?? '?'}日目

短く（3〜4文）、温かく、具体的に励ましてください。今日のデータに触れながら、アーユルヴェーダの智慧を一言添えてください。押しつけがましくなく、友人のように。日本語で。`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ message })
}
