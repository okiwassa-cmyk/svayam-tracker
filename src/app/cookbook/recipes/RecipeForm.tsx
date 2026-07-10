'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CookingPot, Sparkles, AlertTriangle } from 'lucide-react'
import type { Recipe, RecipeIngredient, RecipeStep, Ingredient } from '@/lib/types'
import DoshaBadges from '../DoshaBadges'

const SEASONS = ['春', '夏', '秋', '冬']
const VIRYA_OPTIONS = ['温性', '熱性', '冷性', '中性']
const EFFECT_OPTIONS = [
  { v: -1, label: '↓' },
  { v: 0, label: '→' },
  { v: 1, label: '↑' },
]

type FormState = Partial<Recipe>

export default function RecipeForm({ initial }: { initial?: Recipe }) {
  const router = useRouter()
  const isEdit = !!initial
  const [f, setF] = useState<FormState>(
    initial ?? { name: '', ingredients: [], steps: [], tags: [], season: [], rasa: [] }
  )
  const [dict, setDict] = useState<Ingredient[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [error, setError] = useState('')
  const [cautions, setCautions] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/ingredients').then((r) => r.json()).then((j) => setDict(j.data ?? []))
  }, [])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: val }))
  }

  // ── 材料 ──
  const ings = (f.ingredients as RecipeIngredient[]) ?? []
  function updateIng(idx: number, patch: Partial<RecipeIngredient>) {
    const next = [...ings]
    next[idx] = { ...next[idx], ...patch }
    set('ingredients', next)
  }
  function addIng() {
    set('ingredients', [...ings, { ingredient_id: null, name: '', amount: '', unit: '', section: null }])
  }
  function removeIng(idx: number) {
    set('ingredients', ings.filter((_, i) => i !== idx))
  }
  function onIngNameChange(idx: number, name: string) {
    const matched = dict.find((d) => d.name === name)
    updateIng(idx, { name, ingredient_id: matched?.id ?? null })
  }

  // ── 手順 ──
  const steps = (f.steps as RecipeStep[]) ?? []
  function updateStep(idx: number, text: string) {
    const next = [...steps]
    next[idx] = { ...next[idx], text }
    set('steps', next)
  }
  function addStep() {
    set('steps', [...steps, { text: '' }])
  }
  function removeStep(idx: number) {
    set('steps', steps.filter((_, i) => i !== idx))
  }

  function toggleSeason(s: string) {
    const arr = (f.season as string[]) ?? []
    set('season', arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s])
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('bucket', 'recipe-photos')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (j.url) set('photo_url', j.url)
      else setError(j.error || '写真アップロードに失敗しました')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function analyze() {
    const validIngs = ings.filter((i) => i.name.trim())
    if (validIngs.length === 0) {
      setError('材料を入れてから判定してください')
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const res = await fetch('/api/recipe-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, ingredients: validIngs, description: f.description, steps }),
      })
      const j = await res.json()
      if (j.analysis) {
        setF((prev) => ({
          ...prev,
          vata_effect: j.analysis.vata_effect,
          pitta_effect: j.analysis.pitta_effect,
          kapha_effect: j.analysis.kapha_effect,
          rasa: j.analysis.rasa ?? [],
          virya: j.analysis.virya ?? null,
          season: j.analysis.season ?? [],
          advice: j.analysis.advice ?? null,
        }))
        setCautions(j.cautions ?? [])
      } else {
        setError(j.error || 'AI判定に失敗しました')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!f.name?.trim()) {
      setError('レシピ名は必須です')
      return
    }
    setError('')
    setSaving(true)
    try {
      const clean = { ...f, ingredients: ings.filter((i) => i.name.trim()), steps: steps.filter((s) => s.text.trim()) }
      const res = await fetch('/api/recipes', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clean),
      })
      const j = await res.json()
      if (j.data) router.push(`/cookbook/recipes/${j.data.id}`)
      else setError(j.error || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-xl text-[#4a4234]">{isEdit ? 'レシピを編集' : 'レシピを登録'}</h1>

      <Field label="レシピ名 *">
        <input value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="例：大麦キチディ" className={inputCls} />
      </Field>

      {/* 写真 */}
      <Field label="写真">
        <div className="flex items-center gap-3">
          {f.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photo_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#efe8da]"><CookingPot strokeWidth={1.3} className="h-7 w-7 text-[#c0b59f]" /></div>
          )}
          <label className="cursor-pointer rounded-full border border-[#d8cdb8] bg-[#efe8da] px-4 py-2 text-sm text-[#6b5d45]">
            {photoUploading ? 'アップ中…' : '写真を選ぶ'}
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="分類">
          <input value={f.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="主食 / 汁物…" className={inputCls} />
        </Field>
        <Field label="人数（人前）">
          <input type="number" value={f.servings ?? ''} onChange={(e) => set('servings', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="調理時間（分）">
          <input type="number" value={f.cook_time ?? ''} onChange={(e) => set('cook_time', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </Field>
        <Field label="難易度">
          <input value={f.difficulty ?? ''} onChange={(e) => set('difficulty', e.target.value)} placeholder="かんたん…" className={inputCls} />
        </Field>
      </div>

      <Field label="紹介文">
        <textarea value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} className={textCls} rows={2} />
      </Field>

      {/* 材料 */}
      <SectionTitle>材料</SectionTitle>
      <datalist id="ingredient-dict">
        {dict.map((d) => <option key={d.id} value={d.name} />)}
      </datalist>
      <div className="space-y-2">
        {ings.map((ing, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              list="ingredient-dict"
              value={ing.name}
              onChange={(e) => onIngNameChange(idx, e.target.value)}
              placeholder="食材名"
              className="min-w-0 flex-1 rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-3 py-2 text-sm outline-none"
            />
            <input
              value={ing.amount ?? ''}
              onChange={(e) => updateIng(idx, { amount: e.target.value })}
              placeholder="量"
              className="w-16 rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-2 py-2 text-sm outline-none"
            />
            <input
              value={ing.unit ?? ''}
              onChange={(e) => updateIng(idx, { unit: e.target.value })}
              placeholder="単位"
              className="w-14 rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-2 py-2 text-sm outline-none"
            />
            {ing.ingredient_id ? (
              <span title="事典に登録済み" className="text-emerald-500">●</span>
            ) : (
              <span title="事典に未登録" className="text-stone-300">○</span>
            )}
            <button onClick={() => removeIng(idx)} className="text-rose-300">×</button>
          </div>
        ))}
        <button onClick={addIng} className="w-full rounded-xl border border-dashed border-[#d8cdb8] py-2 text-sm text-[#7d6d4c]">＋ 材料を追加</button>
      </div>

      {/* 手順 */}
      <SectionTitle>作り方</SectionTitle>
      <div className="space-y-2">
        {steps.map((s, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="mt-2 text-sm text-[#7d6d4c]">{idx + 1}</span>
            <textarea value={s.text} onChange={(e) => updateStep(idx, e.target.value)} className={textCls} rows={2} />
            <button onClick={() => removeStep(idx)} className="mt-2 text-rose-300">×</button>
          </div>
        ))}
        <button onClick={addStep} className="w-full rounded-xl border border-dashed border-[#d8cdb8] py-2 text-sm text-[#7d6d4c]">＋ 手順を追加</button>
      </div>

      {/* AI判定 */}
      <SectionTitle>ドーシャ・季節の判定</SectionTitle>
      <button
        onClick={analyze}
        disabled={analyzing}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#c9b98f] bg-[#efe3c4] py-3 text-sm text-[#6b5d45] disabled:opacity-50"
      >
        <Sparkles strokeWidth={1.4} className="h-4 w-4" />
        {analyzing ? '判定中…' : '材料からAIで判定'}
      </button>

      <div className="rounded-2xl border border-[#e4ddd0] bg-[#faf7f1] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#61543c]">ドーシャ作用</span>
          <DoshaBadges vata={f.vata_effect ?? 0} pitta={f.pitta_effect ?? 0} kapha={f.kapha_effect ?? 0} />
        </div>
        {(['vata', 'pitta', 'kapha'] as const).map((d) => {
          const label = { vata: 'ヴァータ', pitta: 'ピッタ', kapha: 'カパ' }[d]
          const key = `${d}_effect` as const
          return (
            <div key={d} className="mt-2 flex items-center justify-between">
              <span className="text-xs text-[#61543c]">{label}</span>
              <div className="flex gap-1.5">
                {EFFECT_OPTIONS.map((o) => (
                  <Chip key={o.v} active={f[key] === o.v} onClick={() => set(key, o.v as -1 | 0 | 1)}>{o.label}</Chip>
                ))}
              </div>
            </div>
          )
        })}
        <div className="mt-3 flex flex-wrap gap-2">
          {VIRYA_OPTIONS.map((v) => (
            <Chip key={v} active={f.virya === v} onClick={() => set('virya', v)}>{v}</Chip>
          ))}
        </div>
        {(f.rasa ?? []).length > 0 && (
          <p className="mt-2 text-xs text-[#61543c]">六味：{(f.rasa as string[]).join('・')}</p>
        )}
      </div>

      <Field label="向いている季節（リトチャリア）">
        <div className="flex gap-2">
          {SEASONS.map((s) => (
            <Chip key={s} active={(f.season as string[] ?? []).includes(s)} onClick={() => toggleSeason(s)}>{s}</Chip>
          ))}
        </div>
      </Field>

      <Field label="アドバイス">
        <textarea value={f.advice ?? ''} onChange={(e) => set('advice', e.target.value)} className={textCls} rows={2} />
      </Field>

      {cautions.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
          {cautions.map((c, i) => <p key={i} className="flex items-start gap-1.5"><AlertTriangle strokeWidth={1.5} className="mt-0.5 h-3.5 w-3.5 shrink-0" />{c}</p>)}
        </div>
      )}

      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-[#6b5d45]">
          <input type="checkbox" checked={!!f.favorite} onChange={(e) => set('favorite', e.target.checked)} /> お気に入り
        </label>
        <label className="flex items-center gap-2 text-sm text-[#6b5d45]">
          <input type="checkbox" checked={!!f.is_paid} onChange={(e) => set('is_paid', e.target.checked)} /> 有料
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()} className="flex-1 rounded-full border border-[#d8cdb8] py-3 text-sm text-[#61543c]">キャンセル</button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-[#a99878] py-3 text-sm text-white disabled:opacity-50">
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-3 py-2.5 text-sm outline-none'
const textCls = 'w-full rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-3 py-2 text-sm outline-none resize-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#61543c]">{label}</label>
      {children}
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="border-b border-[#e4ddd0] pb-1 pt-3 text-sm text-[#7d6d4c]">{children}</h2>
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs transition-colors ${active ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#61543c]'}`}>
      {children}
    </button>
  )
}
