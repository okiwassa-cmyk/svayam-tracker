import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// POST /api/recipe-parse
// { text: "レシピの文章（AI提案や手書きメモをそのまま）" }
// → レシピ登録フォームに流し込める構造化JSONを返す
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text: string = (body.text || '').trim()

    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }

    const systemPrompt = `あなたはレシピ入力を手伝うアシスタントです。
渡されたレシピの文章を読み取り、登録フォーム用の構造化データに変換します。

必ず以下の形式でJSONのみを返す（他のテキスト不要）：
{
  "name": "レシピ名",
  "description": "紹介文（1〜2行。無ければ空文字）",
  "category": "分類（主食 / 汁物 / 副菜 など。分からなければ空文字）",
  "servings": 人数の数字（分からなければ null）,
  "cook_time": 調理時間の分数（分からなければ null）,
  "difficulty": "難易度（かんたん / ふつう / 手間 など。分からなければ空文字）",
  "ingredients": [
    { "name": "食材名", "amount": "量（数字や分数。無ければ空文字）", "unit": "単位（g・合・大さじ・片 など。無ければ空文字）" }
  ],
  "steps": [
    { "text": "手順の文（1ステップ1文）" }
  ]
}

ルール：
- 文章に書かれている情報だけを使う。書かれていない量や手順を勝手に作らない（不明なら空文字やnull）
- 材料の「大さじ1」「小さじ2」「1片」「ひとつまみ」などは amount と unit に分けて入れる（例 amount:"1" unit:"大さじ" ではなく amount:"大さじ1" のように単位に量表現が混ざる場合は unit にまとめてよい。基本は amount=数量, unit=単位）
- 手順は箇条書きや番号を外して、text に本文だけ入れる
- レシピ名が明記されていなければ、内容から自然な名前をつける`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `次のレシピを構造化してください：\n\n${text}` }],
    })

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('no json in AI response', { stop: response.stop_reason, rawText })
      return NextResponse.json(
        { error: `AIの回答を解析できませんでした（${response.stop_reason ?? 'unknown'}）` },
        { status: 500 }
      )
    }
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed.ingredients)) parsed.ingredients = []
    if (!Array.isArray(parsed.steps)) parsed.steps = []

    return NextResponse.json({ parsed })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
