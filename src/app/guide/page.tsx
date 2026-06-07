'use client'

import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { useState } from 'react'

const calorieRows = [
  { meal: '朝食', kcal: '200〜250', note: '軽め・白湯からスタート', color: 'bg-amber-50 text-amber-800' },
  { meal: '昼食', kcal: '600〜700', note: '一日最大（ピッタタイム）', color: 'bg-teal-50 text-teal-800' },
  { meal: '夕食', kcal: '300〜350', note: '18時までに・汁物中心', color: 'bg-stone-50 text-stone-700' },
  { meal: '間食', kcal: 'なし', note: 'アグニを乱すため避ける', color: 'bg-red-50 text-red-600' },
]

const mealExamples = [
  {
    label: '朝食例',
    color: 'bg-amber-50',
    textColor: 'text-amber-800',
    items: [
      '白湯 + 雑穀米小盛（100g） + 味噌汁（豆腐・わかめ）',
      '白湯 + ムング豆粥 + 蒸しほうれん草',
      '白湯 + 蕎麦（温・小盛り） + わかめスープ',
    ],
  },
  {
    label: '昼食例',
    color: 'bg-teal-50',
    textColor: 'text-teal-800',
    items: [
      '雑穀米（150g） + 焼き鮭 + ほうれん草おひたし + 味噌汁',
      '蕎麦（温） + タラの蒸し物 + 海藻スープ',
      'ムング豆スープ + 蒸し野菜（大根・人参） + 雑穀米',
    ],
  },
  {
    label: '夕食例',
    color: 'bg-stone-50',
    textColor: 'text-stone-700',
    items: [
      '味噌汁（豆腐・わかめ） + 白身魚の蒸し物 + 温野菜',
      'ムング豆スープ + 蒸しブロッコリー・大根',
      'お粥（雑穀） + 鯛の薄造り（炙り）',
    ],
  },
]

const sections = [
  {
    id: 'foods',
    title: '食べて良いもの',
    emoji: '✅',
    color: 'green',
    items: [
      { category: '穀物', content: '雑穀米（ベスト）・大麦・押し麦・蕎麦・お粥。白米は小盛りならOK。小麦・パンは減らす。' },
      { category: '野菜（温調理のみ）', content: 'ほうれん草・小松菜・大根・人参・ごぼう・ズッキーニ・アスパラ・きのこ類・海藻（わかめ・昆布）・玉ねぎ・にんにく・生姜。必ず加熱して食べる。' },
      { category: 'タンパク質', content: '豆腐・厚揚げ・納豆・卵（週3〜4個）・白身魚（タラ・鯛・鮭・さわら）。魚は低カロリーでOK。鶏むね・ささみも少量ならOK。' },
      { category: '豆類', content: 'ムング豆（緑豆）のみ推奨。他の豆・ひよこ豆・レンズ豆は減らす。' },
      { category: 'フルーツ', content: 'りんご、洋梨、ザクロ（温めるか常温で）。酸っぱいものは避ける。' },
      { category: '油脂', content: 'ギー（少量）、ごま油（少量）' },
      { category: '飲み物', content: '白湯のみ（温かいもの）。冷たい飲み物は完全NG。' },
    ],
  },
  {
    id: 'avoid',
    title: '避けるもの（ドクター処方）',
    emoji: '⛔',
    color: 'red',
    items: [
      { category: 'サラダ・生野菜', content: '完全NG。必ず加熱調理すること。' },
      { category: 'ヨーグルト・カード', content: '完全NG。乳製品全般（チーズ・牛乳・アイス）も避ける。' },
      { category: '避ける野菜', content: 'じゃがいも・トマト・ピーマン・なす・キャベツ・カリフラワー。これらは減らす。' },
      { category: '豆類（ムング以外）', content: 'ひよこ豆・レンズ豆・その他の豆・大豆製品以外。ムング豆のみOK。' },
      { category: '小麦・パン', content: 'パン・パスタ・うどん。減らす方向で。蕎麦・雑穀米に替える。' },
      { category: '肉（脂の多いもの）', content: '豚・牛・ラム・揚げた肉は避ける。鶏むね・ささみは少量OK。' },
      { category: 'イカ・エビ・タコ', content: '消化に重くカファを増やすため避ける。魚（白身・青魚）はOK。' },
      { category: '揚げ物・焼き菓子', content: '完全NG。揚げる・オーブンで焼く調理法も避ける。' },
      { category: '辛すぎる・酸っぱい・塩辛い', content: '過剰は避ける。スパイスは適量のみ。' },
      { category: '冷えたまま食べること', content: '冷蔵庫のものは必ず温めてから食べる。飲み物も常温〜温かいものを。冷たいまま食べるのがNG。' },
      { category: '間食・夜遅い食事', content: '間食NG。夜7時以降の食事も避ける。' },
    ],
  },
  {
    id: 'cooking',
    title: '推奨料理法',
    emoji: '🍳',
    color: 'amber',
    items: [
      { category: '蒸す ✓', content: '最もカファに適した調理法。野菜・豆腐を蒸す。' },
      { category: '煮る ✓', content: 'スープ・お粥・ムング豆カレー。温かく消化しやすい。' },
      { category: '炒める ✓', content: '少量のギー・ごま油でスパイスと一緒に。' },
      { category: '揚げる ✗', content: '完全NG。アーマを増やす。' },
      { category: 'オーブン焼き ✗', content: 'ドクター処方でNG（乾燥・重い食になる）。' },
      { category: '生食（サラダ）✗', content: '完全NG。必ず加熱すること。' },
    ],
  },
  {
    id: 'drinks',
    title: 'おすすめの飲み物',
    emoji: '🍵',
    color: 'teal',
    items: [
      { category: '白湯', content: '起床直後・食間に必ず。カファを溶かし代謝を上げる基本の飲み物。1日1.5〜2L目標。' },
      { category: '生姜湯', content: '生姜スライス数枚をお湯に浸すだけ。朝の白湯代わりに◎。アグニを高め脂肪燃焼を促す。' },
      { category: 'CCFティー', content: 'クミン・コリアンダー・フェンネルを同量煮出したハーブティー。アーユルヴェーダの定番消化茶。食後に。' },
      { category: 'ターメリックラテ', content: 'ターメリック小さじ1/4 + 黒胡椒少々 + お湯（または温めたオーツミルク）。抗炎症・カファ軽減。' },
      { category: 'ほうじ茶・番茶', content: '温かく飲む。カフェインが少なく胃に優しい。食事中・食後に。' },
      { category: 'フェンネルティー', content: 'フェンネルシード小さじ1をお湯で煮出す。食後の消化促進・お腹の張りを解消。' },
      { category: 'トゥルシーティー（ホーリーバジル）', content: 'ストレス緩和・免疫強化。カファ・ピッタ両方に◎。乾燥ハーブで入れられる。' },
      { category: 'ペパーミントティー', content: 'ピッタの熱を冷ます。食後の消化サポートに。ただし冷えている時期は控えめに。' },
      { category: '避ける飲み物', content: '冷たい水・ジュース・牛乳・コーヒー（過剰）・アルコール・甘い飲み物・炭酸飲料。' },
    ],
  },
  {
    id: 'spices',
    title: 'スパイス・ハーブ',
    emoji: '🌿',
    color: 'orange',
    items: [
      { category: 'ターメリック', content: '抗炎症・消化促進。毎日の料理に小さじ1/2' },
      { category: '生姜', content: 'アグニ点火。食前に少量、料理に積極的に使用' },
      { category: '黒胡椒', content: 'カファ軽減・代謝UP。ただし過剰はピッタを乱す' },
      { category: 'クミン', content: '消化促進・腸内ガス軽減。炒め油に最初に入れる' },
      { category: 'コリアンダー', content: 'ピッタ鎮静・解毒。カファ×ピッタの理想スパイス' },
      { category: 'フェンネル', content: '消化改善・食後のガス予防。食後に噛む習慣も◎' },
      { category: 'トリカトゥ', content: '生姜・黒胡椒・ピッパリの組合せ。カファ燃焼に特効' },
      { category: 'カルダモン', content: '消化・口臭予防。チャイやデザートに' },
    ],
  },
  {
    id: 'timing',
    title: '食事のタイミング',
    emoji: '🕐',
    color: 'blue',
    items: [
      { category: '朝食', content: '軽め。白湯・フルーツ・お粥など。7〜9時が理想' },
      { category: '昼食', content: '一番大きな食事。12〜14時（ピッタタイムで消化力最大）' },
      { category: '夕食', content: '軽め・温かいもの。18〜19時までに。遅くとも19時' },
      { category: '間食', content: '原則NG。どうしても必要な時は生姜湯・ナッツ少量' },
      { category: '食後', content: '10〜15分散歩。すぐ横にならない' },
      { category: '水分', content: '食事中は少量の温かい飲み物のみ。大量の水はアグニを消す' },
    ],
  },
]

const colorMap: Record<string, { header: string; badge: string; border: string }> = {
  green:  { header: 'bg-green-500',  badge: 'bg-green-100 text-green-700',  border: 'border-green-200' },
  red:    { header: 'bg-red-500',    badge: 'bg-red-100 text-red-700',      border: 'border-red-200' },
  amber:  { header: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200' },
  orange: { header: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  blue:   { header: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700',    border: 'border-blue-200' },
  teal:   { header: 'bg-teal-600',   badge: 'bg-teal-100 text-teal-700',    border: 'border-teal-200' },
}

export default function GuidePage() {
  const [open, setOpen] = useState<string | null>('foods')

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-teal-800 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-teal-200 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold">カファ・ピッタ食事ガイド</h1>
        <p className="text-teal-200 text-sm mt-0.5">1200〜1300 kcal / 和食ベース</p>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Calorie targets */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-500 mb-2">1日のカロリー目安</p>
          <div className="space-y-1.5">
            {calorieRows.map((r) => (
              <div key={r.meal} className={`${r.color} rounded-xl px-3 py-2 flex items-center justify-between`}>
                <div>
                  <span className="text-xs font-bold">{r.meal}</span>
                  <span className="text-xs opacity-70 ml-2">{r.note}</span>
                </div>
                <span className="text-sm font-bold">{r.kcal} <span className="text-xs font-normal">kcal</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Meal examples */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-500 mb-2">食事例（和食ベース）</p>
          <div className="space-y-2">
            {mealExamples.map((m) => (
              <div key={m.label} className={`${m.color} rounded-xl p-3`}>
                <p className={`text-xs font-bold mb-1 ${m.textColor}`}>{m.label}</p>
                {m.items.map((ex, i) => (
                  <p key={i} className="text-xs text-stone-600">・{ex}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
        {sections.map((section) => {
          const c = colorMap[section.color]
          const isOpen = open === section.id
          return (
            <div key={section.id} className={`rounded-2xl overflow-hidden shadow-sm border ${c.border}`}>
              <button
                className={`w-full flex items-center justify-between px-4 py-3.5 ${c.header} text-white`}
                onClick={() => setOpen(isOpen ? null : section.id)}
              >
                <span className="font-bold text-base">{section.emoji} {section.title}</span>
                <span className="text-lg">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="bg-white divide-y divide-stone-100">
                  {section.items.map((item) => (
                    <div key={item.category} className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                        {item.category}
                      </span>
                      <p className="text-sm text-stone-600 mt-1.5">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
