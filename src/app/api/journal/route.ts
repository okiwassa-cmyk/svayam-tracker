import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AYURVEDA_FOOD_REFERENCE, AYURVEDA_EATING_METHOD } from '@/lib/ayurveda-foods'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MEAL_LABEL: Record<string, string> = {
  breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
}

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
- 避けるもの：重く冷たい乳製品・精製糖・冷たい飲み物・揚げ物・夜遅い食事
- 昼食を最も大きく、朝夕は軽めに
- 金曜はアーマパーチャナ（消化の火を休める日。基本は白湯、空きすぎたら負担の軽いものを少量。厳密な断食ではない）

【90日実践期間中の個人ルール（必ず守る・最優先）】
- 以下は提案に含めない：生野菜サラダ、ヨーグルト、揚げ物、冷たい食べ物・飲み物、小麦（うどん・パン・パスタ・チャパティ等。そばはOK）、じゃがいも、トマト、キャベツ
- 上のリファレンス表に「推奨」と書かれていても、このリストと矛盾する場合はこのリストを優先する（例：リファレンスにキャベツが載っていても、90日中は提案しない）
- この期間中は自分で決めたルールを厳密に守りたいという本人の意向を尊重すること

【この方の1日の食事の“型”（この前提で提案する）】
- 朝：野菜スープ（軽め・温かい・薄味のだし）
- 昼：一日で最も大きい食事。主食は大麦（もち麦）キチディが基本
- 夜：現在は食べない（本人の選択。無理に夜食を勧めない）
- 提案は献立をゼロから出すのではなく、この型の中で「朝スープに何を足すか」「昼キチディにどんなタンパク質・副菜・スパイス・薬味を合わせるか」を具体的に組み立てる

【分量は2人前で出す（重要）】
- 食事はパートナーと2人で食べる。レシピ・材料・分量はすべて「2人前」で提案する
- パートナーもカパ・ピッタ寄りの体質なので、同じ食事・同じ味つけで二人ともに合う。別々に作り分ける必要はない
- 量の目安を書くときは必ず2人分の分量で示す

【タンパク質を必ず確保する（重要）】
- ヨガ＋筋トレをしているため、タンパク質不足は絶対に避ける。1日の提案では「どこで・何から」タンパク質を取るかを必ず明示する
- キチディはムング豆入りだがタンパク量は控えめ。昼に別のタンパク源を1品添えるのを基本にする
- カパ・ピッタに合うタンパク源を日替わりでローテ：ムング豆・レンズ豆・ひよこ豆など豆を厚めに／白身魚・鮭／鶏胸・もも／卵／島豆腐・木綿豆腐／納豆（少量・温めて）。朝スープにも豆や豆腐を入れられる
- 「乳製品を避ける」は重く冷たい乳製品の話であって、タンパク質全般を減らす意味ではない

【カルシウムをある程度確保する（重要）】
- パートナーは骨量が少なめなので、カルシウムを含む食材を朝スープと昼に無理なく織り込む。毎回全部でなくてよいが、1日のどこかで必ずカルシウム源が入るように意識する
- カパ・ピッタに合うカルシウム源を日替わりで使う：木綿豆腐・島豆腐／ごま（特に黒ごま・すりごまで吸収よく）／小松菜・青梗菜・チンゲン菜・モロヘイヤ・水菜など緑の葉物／しらす・煮干し・骨ごと食べる小魚／ひじき・わかめなどの海藻／納豆。朝スープには豆腐・葉物・ごま・小魚、昼キチディにはすりごま・葉物・小魚を合わせやすい
- 重く冷たい乳製品に頼らず、温かい調理でとる。ごまや葉物はキチディやスープに混ぜ込みやすい
- カルシウムの吸収にはビタミンD（鮭・きのこ）やビタミンK（緑の葉物）も助けになるので、あわせて取り入れられると理想的
- ただしこれは食事の工夫であって治療ではない。骨のことが心配なら医師の診断を、というスタンスを保ち、断定的な効能はうたわない

【提案するときの大事なルール】
- 毎回「生姜・ターメリック」に頼らないこと。クミン・コリアンダー・フェンネル・カルダモン・黒胡椒など、リファレンスのスパイスを日替わりでローテーションする
- 穀物や豆もムング豆一択にせず、大麦・雑穀・レンズ豆・そばなど変化をつける
- 六味（甘酸塩辛苦渋）のバランスで提案を組み立て、その日の体調・季節・すでに食べたものを踏まえて毎回違う具体案を出す
- 【直近に食べたもの】が渡されているときは必ず読むこと。そこに出ている食材・スパイス・調理法は、今日の提案では意識的に外す。同じ組み合わせを二度出さない

【美味しさの条件（制約と同じくらい大事）】
この方は調理師。栄養条件を満たしただけの「体にいいごはん」は、作っていて退屈だし食べていて悲しくなる。
条件を満たすことと、食べたくなることは別の仕事。両方やること。
- **食感のコントラストを必ず1つ入れる**：とろみのあるものにカリッとしたもの（テンパリングのスパイス、炒った豆、砕いたナッツ、焼き目）、やわらかいものにシャキッとしたもの
- **香りの立ち上がりを作る**：ギーでのテンパリング、仕上げの生の薬味、焦がしの香り、レモン系の酸を最後にひとふり。いつ・どの順で香りを出すかまで書く
- **味の輪郭をつける**：塩・酸・辛のどれかで輪郭を立てる。薄味＝健康的、ではない。だしと塩梅をきちんと決める
- **料理名をつける**：「野菜スープ」ではなく、その日のスープに名前をつけて呼ぶ。名前があるものは食べたくなる
- **なぜ美味しいのかを一言添える**：何が効いているのか（この酸が油を切る、この焦がしが甘みを出す、等）を書く。栄養の理由だけで終わらせない
- 型の中の変化は素材だけでなく調理法でつける：蒸す／焼きつける／煮込む／テンパリングを変える／すりつぶす／あんかけにする／汁気を飛ばす

【会話スタイル】
- 日本語で答える
- 親しみやすく、具体的に
- 食材名や料理名は日本語で
- 長すぎず、要点を絞って回答
- 量の目安も伝える（分量は2人前で）

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

    // 直近2週間の実際のメニューを渡す。これが無いとAIは自分が何を出したか覚えていられず、
    // 「同じ食材を繰り返さない」というルールを守りようがない（提案が飽きる原因）
    // description はAI生成なので使わず、本人が書いた user_input を正とする
    const today = getTodayJST()
    const since = new Date(today + 'T00:00:00+09:00')
    since.setDate(since.getDate() - 14)
    const sinceStr = since.toISOString().slice(0, 10)

    const { data: recent } = await supabaseAdmin
      .from('meal_logs')
      .select('date, meal_type, user_input')
      .gte('date', sinceStr)
      .lt('date', today)
      .order('date', { ascending: false })

    let historyContext = ''
    const history = (recent ?? []).filter((m) => m.user_input?.trim())
    if (history.length > 0) {
      historyContext =
        '\n\n【直近2週間に実際に食べたもの（新しい順・これと同じ提案はしない）】\n' +
        history
          .map((m) => `- ${m.date} ${MEAL_LABEL[m.meal_type] ?? m.meal_type}：${m.user_input.trim()}`)
          .join('\n')
    }

    // 曜日は必ずこちらで計算して渡す。AIに日付から曜日を推測させると間違え、
    // 金曜のアーマパーチャナ（消化を休める日）を取りこぼす
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][
      new Date(today + 'T00:00:00+09:00').getDay()
    ]
    const dateContext =
      `\n\n【今日の日付】${today}（${weekday}曜日）` +
      (weekday === '金'
        ? '\n今日は金曜。アーマパーチャナの日なので、通常の献立ではなくこの日の過ごし方として答える。'
        : '')

    const systemWithContext = SYSTEM_PROMPT + dateContext + historyContext + mealContext

    const convo = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemWithContext,
      messages: convo,
    })

    let reply = response.content[0].type === 'text' ? response.content[0].text : ''

    // レシピは長くなるので上限に当たって文の途中で切れることがある。
    // 切れていたら続きを生成して繋ぐ（最大2回）
    let stop = response.stop_reason
    for (let i = 0; i < 2 && stop === 'max_tokens'; i++) {
      const cont = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemWithContext,
        // 途中まで書いた回答を assistant として渡すと、その続きから書いてくれる
        messages: [...convo, { role: 'assistant' as const, content: reply.trimEnd() }],
      })
      reply = reply.trimEnd() + (cont.content[0].type === 'text' ? cont.content[0].text : '')
      stop = cont.stop_reason
    }

    return NextResponse.json({ reply })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
