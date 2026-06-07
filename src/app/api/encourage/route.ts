import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { habitRate, energy, streak, dayNumber } = await req.json()

  const prompt = `あなたはアーユルヴェーダの師（グル）です。カファ・ピッタ体質の弟子が90日間の実験に取り組んでいます。
今日の状況：習慣達成率${habitRate ?? '?'}%、エネルギーレベル${energy ?? '?'}/10、実験${dayNumber ?? '?'}日目。

短く（3〜4文）、温かく、具体的に励ましてください。アーユルヴェーダの智慧を一言添えると良い。押しつけがましくなく、友人のように。日本語で。`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ message })
}
