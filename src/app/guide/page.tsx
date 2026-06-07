'use client'

import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { useState } from 'react'

const sections = [
  {
    id: 'foods',
    title: '食べて良いもの',
    emoji: '✅',
    color: 'green',
    items: [
      { category: '穀物', content: 'キビ、大麦、ライ麦、オート麦（小麦・白米は少量）' },
      { category: '野菜', content: '葉物野菜、ブロッコリー、カリフラワー、ほうれん草、大根、ゴーヤ、にんにく、玉ねぎ' },
      { category: '豆類', content: 'レンズ豆、ひよこ豆、緑豆（消化しやすい）' },
      { category: 'フルーツ', content: 'りんご、洋梨、ザクロ、ベリー類（甘すぎないもの）' },
      { category: 'タンパク質', content: '白身魚、鶏むね肉（少量）、卵白、豆腐' },
      { category: '油脂', content: 'ギー（少量）、ごま油（少量）、オリーブオイル' },
    ],
  },
  {
    id: 'avoid',
    title: '避けるもの',
    emoji: '⛔',
    color: 'red',
    items: [
      { category: '乳製品', content: 'チーズ、アイスクリーム、牛乳（ヨーグルトも控えめに）' },
      { category: '甘いもの', content: '精製糖、お菓子、甘い飲み物、ジュース' },
      { category: '冷たいもの', content: '冷たい飲み物、冷蔵庫から出したばかりの食品' },
      { category: '重い食品', content: '揚げ物、脂っこい肉、加工食品、ファストフード' },
      { category: '小麦・米', content: 'パン、パスタ、白米（主食は控えめに）' },
      { category: '食べ方', content: '夜7時以降の食事、間食、食べすぎ、早食い' },
    ],
  },
  {
    id: 'cooking',
    title: '推奨料理法',
    emoji: '🍳',
    color: 'amber',
    items: [
      { category: '蒸す', content: '野菜・魚を蒸すと消化しやすく軽い。カファ軽減に最適' },
      { category: '炒める', content: 'スパイスと一緒に少量の油で炒める。アグニを高める' },
      { category: '煮る', content: 'スープ・カレー・豆料理。温かく消化しやすい' },
      { category: '焼く', content: 'グリル・オーブン焼き。余分な脂を落とせる' },
      { category: '避ける調理法', content: '揚げ物、フライ、生食の多用（特に冬）' },
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
}

export default function GuidePage() {
  const [open, setOpen] = useState<string | null>('foods')

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-emerald-600 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-emerald-200 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold">カファ・ピッタ食事ガイド</h1>
        <p className="text-emerald-200 text-sm mt-0.5">タップで開閉</p>
      </header>

      <div className="px-4 py-4 space-y-3">
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
