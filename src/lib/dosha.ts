import type { DoshaEffect } from './types'

export type DoshaKey = 'vata' | 'pitta' | 'kapha'

export const DOSHA_LABEL: Record<DoshaKey, string> = {
  vata: 'ヴァータ',
  pitta: 'ピッタ',
  kapha: 'カパ',
}

// 季節ごとに増えやすいドーシャ（リトチャリア）
export const SEASON_DOSHA: Record<string, DoshaKey> = {
  春: 'kapha',
  夏: 'pitta',
  秋: 'pitta', // 初秋はピッタ、晩秋〜はヴァータだが亜熱帯前提でピッタ寄せ
  冬: 'vata',
}

type EffectSource = {
  vata_effect: DoshaEffect | number | null
  pitta_effect: DoshaEffect | number | null
  kapha_effect: DoshaEffect | number | null
}

function effectFor(item: EffectSource, dosha: DoshaKey): number {
  const v = item[`${dosha}_effect` as const]
  return typeof v === 'number' ? v : 0
}

// 選んだ体質（1つ or 複数）に対する両立度を判定
// 返り値: 'excellent' すべて鎮める / 'good' 悪化させない（鎮める＋中庸）/ 'caution' どれか1つ悪化 / 'avoid' 複数悪化
export type Compatibility = 'excellent' | 'good' | 'caution' | 'avoid'

export const COMPAT_MARK: Record<Compatibility, string> = {
  excellent: '◎',
  good: '○',
  caution: '△',
  avoid: '✗',
}

export const COMPAT_LABEL: Record<Compatibility, string> = {
  excellent: 'とても合う',
  good: '合う',
  caution: '少し注意',
  avoid: '避けたい',
}

export function compatibility(item: EffectSource, doshas: DoshaKey[]): Compatibility {
  if (doshas.length === 0) return 'good'
  const effects = doshas.map((d) => effectFor(item, d))
  const aggravate = effects.filter((e) => e > 0).length
  const pacify = effects.filter((e) => e < 0).length
  if (aggravate === 0 && pacify === effects.length) return 'excellent' // 全部鎮める
  if (aggravate === 0) return 'good' // 悪化なし（一部中庸）
  if (aggravate === 1) return 'caution'
  return 'avoid'
}

// 並び替え用スコア（大きいほど良い）: 鎮める=+2, 中庸=0, 悪化=-3
export function compatScore(item: EffectSource, doshas: DoshaKey[]): number {
  if (doshas.length === 0) return 0
  return doshas.reduce((acc, d) => {
    const e = effectFor(item, d)
    return acc + (e < 0 ? 2 : e > 0 ? -3 : 0)
  }, 0)
}

// 今のアンバランス（増えているドーシャ）を追加で鎮めるほど加点
export function imbalanceBonus(item: EffectSource, imbalance: DoshaKey[]): number {
  return imbalance.reduce((acc, d) => acc + (effectFor(item, d) < 0 ? 3 : effectFor(item, d) > 0 ? -3 : 0), 0)
}

// 季節にどれだけ向くか（その季節に増えるドーシャを鎮めれば加点）
export function seasonBonus(item: EffectSource, season: string | null): number {
  if (!season) return 0
  const d = SEASON_DOSHA[season]
  if (!d) return 0
  const e = effectFor(item, d)
  return e < 0 ? 3 : e > 0 ? -3 : 0
}

// ドーシャ作用の見た目（矢印）
export function effectArrow(e: DoshaEffect | number | null): string {
  if (e === null) return '—'
  return e < 0 ? '↓' : e > 0 ? '↑' : '→'
}

export function effectColor(e: DoshaEffect | number | null): string {
  if (e === null || e === 0) return 'text-stone-400'
  return e < 0 ? 'text-emerald-600' : 'text-rose-500'
}
