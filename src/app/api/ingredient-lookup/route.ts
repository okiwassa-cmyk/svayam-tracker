import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AYURVEDA_FOOD_REFERENCE, AYURVEDA_EATING_METHOD } from '@/lib/ayurveda-foods'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// POST /api/ingredient-lookup  { name: "ゴーヤ" }
// → 食材効能のドラフトをJSONで返す（下書き。ユーザーが確認・修正して保存する前提）
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    const systemPrompt = `あなたはアーユルヴェーダ・東洋医学・栄養学に詳しい食材リサーチャーです。
食材名を受け取り、その食材の効能を多層的にまとめて「下書き」を作ります。

重要な原則：
- これはあくまで一般的な文献知識に基づく「下書き（推定）」です。確実でない項目は無理に埋めず null にしてください。
- 事実を捏造しないこと。特に沖縄の伝承・特定地域の民間知は、確かでなければ書かない（null）。
- 下記リファレンスに該当食材があれば、その内容を最優先で使う。

必ず以下の形式でJSONのみを返す（他のテキストは一切不要）：
{
  "name": "正式な食材名（日本語）",
  "aliases": "別名があれば（沖縄名など）。なければ null",
  "category": "分類（例：豆類/穀物/野菜/葉もの/スパイス/果物/その他）",
  "rasa": ["六味を強い順に。使う語は「甘」「酸」「塩」「辛」「苦」「渋」のみ。1〜複数"],
  "virya": "温性 | 熱性 | 冷性 | 中性 のいずれか",
  "vata_effect": -1 | 0 | 1（ヴァータを 鎮める=-1 / 中庸=0 / 増やす=1）,
  "pitta_effect": -1 | 0 | 1,
  "kapha_effect": -1 | 0 | 1,
  "guna": "グナ（重・軽・油・乾など性質）。わからなければ null",
  "karma": "アーユルヴェーダ的な働き・作用を一言。なければ null",
  "tcm_nature": "東洋医学の四気（熱/温/平/涼/寒）。わからなければ null",
  "tcm_taste": "東洋医学の五味（酸/苦/甘/辛/鹹）。わからなければ null",
  "tcm_meridian": "帰経（肺/脾/胃/肝/腎など）。わからなければ null",
  "tcm_effect": "薬膳的な効能を一言。なければ null",
  "folklore": "沖縄・日本などの伝承や民間知。確かでなければ null（捏造しない）",
  "folklore_region": ["沖縄" や "本土" など。該当地域がわかる場合のみ。なければ空配列 []"],
  "nutrition": "現代栄養データの要点（主な栄養素）。なければ null",
  "caution": "食べ合わせ・過剰摂取・有毒性などの注意。なければ null",
  "advice_note": "この食材を扱ううえでの一言メモ。なければ null"
}

ヴィーリヤ（温冷）とドーシャ作用は逆になりうる点に注意（例：スベリヒユは温性だがピッタを鎮める）。

${AYURVEDA_FOOD_REFERENCE}

${AYURVEDA_EATING_METHOD}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `次の食材の効能を下書きしてください：${String(name).trim()}` }],
    })

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
    // ```json フェンスを除去
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('no json in AI response', { stop: response.stop_reason, rawText })
      return NextResponse.json(
        { error: `AIの回答を解析できませんでした（${response.stop_reason ?? 'unknown'}）` },
        { status: 500 }
      )
    }
    const draft = JSON.parse(jsonMatch[0])

    // 推定(AI)フラグを立てる。noteにadvice_memoを寄せる
    draft.source = '推定(AI)'
    if (draft.advice_note) {
      draft.note = draft.advice_note
      delete draft.advice_note
    }
    if (!Array.isArray(draft.folklore_region)) draft.folklore_region = []
    if (!Array.isArray(draft.rasa)) draft.rasa = draft.rasa ? [draft.rasa] : []

    return NextResponse.json({ draft })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
