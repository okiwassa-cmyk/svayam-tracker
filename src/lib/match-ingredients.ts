// 食事のテキスト（user_input）から、食材事典に載っている食材を拾う。
// 長い名前を先に当てて、当たった範囲は消す。
// そうしないと「切り干し大根」が「大根」に、「シークヮーサー」が「桑（クワ）」に化ける。

export type MatchableIngredient = {
  id: string
  name: string
  aliases: string | null
  vata_effect: number | null
  pitta_effect: number | null
  kapha_effect: number | null
}

const SMALL_KANA: Record<string, string> = {
  ァ: 'ア', ィ: 'イ', ゥ: 'ウ', ェ: 'エ', ォ: 'オ',
  ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ', ヮ: 'ワ', ヵ: 'カ', ヶ: 'ケ', ッ: 'ツ',
}

// 事典は「シークヮーサー」、本人のメモは「シークワサー」のように書かれる。
// 長音と小書きかなを潰して、揺れても同じ形に落とす。
// 空白は残す（消すと「ピクルス　イカ」が「スイカ」になる）
function fold(s: string): string {
  return s
    .replace(/[ー－]/g, '')
    .replace(/[ァィゥェォャュョヮヵヶッ]/g, (c) => SMALL_KANA[c] ?? c)
    .replace(/[\s\u3000]+/g, ' ')
}

// ひらがな→カタカナ。「しょうが」と「ショウガ」を同じにする。
// fold と違って文字数が変わらないので、位置は fold 後の文字列と一致する
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
}

const HAS_KANJI = /\p{Script=Han}/u

// 漢字1文字（鮭・米）は名前として成立するが、かな1文字はただのノイズ。
// かな2文字の別名も落とす（桑の別名「クワ」が「ちくわ」に当たる）。
// 名前そのものなら2文字でも残す（そば・エビは食材名として使われる）
function usableTerm(t: string, isName: boolean): boolean {
  if (t.length >= 3) return true
  if (t.length === 2) return isName || HAS_KANJI.test(t)
  return HAS_KANJI.test(t)
}

// 別名は「長ねぎ／ビラ（沖縄方言）」のような形で入っている。
// 当たった語を表示に使うので、照合用（term）と元の表記（label）の両方を持つ
function termsOf(ing: MatchableIngredient): { term: string; label: string }[] {
  return [ing.name, ...(ing.aliases ?? '').split(/[／/、,]/)]
    .map((t, i) => {
      const label = t.replace(/[（(][^）)]*[）)]/g, '').trim()
      return { term: toKatakana(fold(label)), label, isName: i === 0 }
    })
    .filter(({ term, isName }) => usableTerm(term, isName))
}

// 見出し語と違う呼び方で当たったら併記する（「タマナ（キャベツ）」）
export type MatchedIngredient = MatchableIngredient & { matched_as: string | null }

export function matchIngredients(
  text: string,
  ingredients: MatchableIngredient[]
): MatchedIngredient[] {
  const haystack = toKatakana(fold(text))
  const terms = ingredients
    .flatMap((ing) => termsOf(ing).map((t) => ({ ing, ...t })))
    .sort((a, b) => b.term.length - a.term.length)

  const consumed = new Array(haystack.length).fill(false)
  const found = new Map<string, MatchedIngredient>()

  for (const { ing, term, label } of terms) {
    if (found.has(ing.id)) continue
    let from = 0
    for (;;) {
      const at = haystack.indexOf(term, from)
      if (at === -1) break
      const free = consumed.slice(at, at + term.length).every((c) => !c)
      if (free) {
        for (let i = at; i < at + term.length; i++) consumed[i] = true
        found.set(ing.id, { ...ing, matched_as: label === ing.name ? null : label })
        break
      }
      from = at + 1
    }
  }

  return [...found.values()]
}
