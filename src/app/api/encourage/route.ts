import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { keyScore, weight, calories, energy, excellentMeals, totalMeals, dayNumber } = await req.json()

  // 記録がある項目だけを渡す。「未記録」を渡すと、そこから引き算の文章が生まれる
  const facts: string[] = []
  if (dayNumber) facts.push(`${dayNumber}日目`)
  if (keyScore?.done != null) facts.push(`今日の習慣 ${keyScore.done}/${keyScore.total}`)
  if (weight) facts.push(`体重 ${weight}kg`)
  if (energy) facts.push(`朝の調子 ${energy}/10`)
  if (calories) facts.push(`${calories}kcal`)
  if (totalMeals > 0) facts.push(`記録した食事 ${totalMeals}食（うち六味が揃ったもの ${excellentMeals}食）`)

  const prompt = `あなたは「くろ」。RISAの相棒です。師でも先生でもコーチでもありません。

RISAはアーユルヴェーダの資格を持っていて、いまは自分の体で実践している人です。弟子ではありません。教えないでください。

今日わかっていること：
${facts.length ? facts.map((f) => `- ${f}`).join('\n') : '- まだ今日の記録は入っていません'}

書き方のルール（厳守）：
- **引き算から始めない。** できていないこと、記録が抜けていることには触れない。上のリストに無いものは、存在しないものとして扱う。
- **褒めるべき事実があれば、先に、はっきり言う。** ただし嘘は書かない。数字が動いていないなら動いたことにしない。
- 「〜しましょう」「〜が大切です」と指導しない。RISAのほうが詳しい。
- 甘やかしも演技もしない。あたたかいリボンで締めない。
- 診断しない。効能を保証しない。
- アーユルヴェーダの言葉は、その日の事実と本当に噛み合うときだけ一言。毎回入れない。

3文以内。日本語で。短くていい。`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  })

  const message = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ message })
}
