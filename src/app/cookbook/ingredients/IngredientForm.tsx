'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Leaf, Sparkles } from 'lucide-react'
import type { Ingredient } from '@/lib/types'

const RASA_OPTIONS = ['甘', '酸', '塩', '辛', '苦', '渋']
const VIRYA_OPTIONS = ['温性', '熱性', '冷性', '中性']
const EFFECT_OPTIONS = [
  { v: -1, label: '↓ 鎮める' },
  { v: 0, label: '→ 中庸' },
  { v: 1, label: '↑ 増やす' },
]
const REGION_OPTIONS = ['沖縄', '本土', 'その他']
const SOURCE_OPTIONS = ['一次ソース', '推定', '推定(AI)']

type FormState = Partial<Ingredient>

export default function IngredientForm({ initial }: { initial?: Ingredient }) {
  const router = useRouter()
  const isEdit = !!initial
  const [f, setF] = useState<FormState>(
    initial ?? {
      name: '',
      rasa: [],
      folklore_region: [],
      vata_effect: 0,
      pitta_effect: 0,
      kapha_effect: 0,
      source: '推定',
    }
  )
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: val }))
  }

  function toggleArr(key: 'rasa' | 'folklore_region', val: string) {
    setF((prev) => {
      const arr = (prev[key] as string[] | undefined) ?? []
      return { ...prev, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] }
    })
  }

  async function runAI() {
    if (!f.name?.trim()) {
      setError('食材名を入れてからAIに調べさせてください')
      return
    }
    setError('')
    setAiLoading(true)
    try {
      const res = await fetch('/api/ingredient-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name.trim() }),
      })
      const j = await res.json()
      if (j.draft) {
        // 既存の写真・favoriteは残し、他はAI下書きで上書き（source=推定(AI)）
        setF((prev) => ({ ...prev, ...j.draft, photo_url: prev.photo_url, favorite: prev.favorite, id: prev.id }))
      } else {
        setError(j.error || 'AIの調査に失敗しました')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setAiLoading(false)
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('bucket', 'ingredient-photos')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (j.url) set('photo_url', j.url)
      else setError(j.error || '写真アップロードに失敗しました')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function save() {
    if (!f.name?.trim()) {
      setError('食材名は必須です')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/ingredients', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const j = await res.json()
      if (j.data) {
        router.push(`/cookbook/ingredients/${j.data.id}`)
      } else {
        setError(j.error || '保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const isAI = f.source === '推定(AI)'

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-xl text-[#4a4234]">{isEdit ? '食材を編集' : '食材を登録'}</h1>

      {/* 名前 + AI */}
      <div>
        <label className="mb-1 block text-xs text-[#8a7d64]">食材名 *</label>
        <div className="flex gap-2">
          <input
            value={f.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
            placeholder="例：ゴーヤ"
            className="min-w-0 flex-1 rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={runAI}
            disabled={aiLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c9b98f] bg-[#efe3c4] px-4 text-sm text-[#6b5d45] disabled:opacity-50"
          >
            <Sparkles strokeWidth={1.4} className="h-4 w-4" />
            {aiLoading ? '調査中…' : 'AIで調べる'}
          </button>
        </div>
        {isAI && (
          <p className="mt-1.5 text-xs text-[#b58a4a]">
            ※ AIの下書きです。内容を確認して、正しければ出典を変更して保存してください
          </p>
        )}
      </div>

      {/* 写真 */}
      <div>
        <label className="mb-1 block text-xs text-[#8a7d64]">写真</label>
        <div className="flex items-center gap-3">
          {f.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photo_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#efe8da]"><Leaf strokeWidth={1.4} className="h-6 w-6 text-[#c0b59f]" /></div>
          )}
          <label className="cursor-pointer rounded-full border border-[#d8cdb8] bg-[#efe8da] px-4 py-2 text-sm text-[#6b5d45]">
            {photoUploading ? 'アップ中…' : '写真を選ぶ'}
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
        </div>
      </div>

      <Field label="別名（沖縄名など）">
        <input value={f.aliases ?? ''} onChange={(e) => set('aliases', e.target.value)} className={inputCls} />
      </Field>
      <Field label="分類">
        <input value={f.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="豆類 / 野菜 / スパイス…" className={inputCls} />
      </Field>

      {/* アーユルヴェーダ */}
      <SectionTitle>アーユルヴェーダ</SectionTitle>
      <Field label="六味（ラサ）">
        <div className="flex flex-wrap gap-2">
          {RASA_OPTIONS.map((r) => (
            <Chip key={r} active={(f.rasa ?? []).includes(r)} onClick={() => toggleArr('rasa', r)}>{r}</Chip>
          ))}
        </div>
      </Field>
      <Field label="ヴィーリヤ（温冷）">
        <div className="flex flex-wrap gap-2">
          {VIRYA_OPTIONS.map((v) => (
            <Chip key={v} active={f.virya === v} onClick={() => set('virya', v)}>{v}</Chip>
          ))}
        </div>
      </Field>
      {(['vata', 'pitta', 'kapha'] as const).map((d) => {
        const label = { vata: 'ヴァータ', pitta: 'ピッタ', kapha: 'カパ' }[d]
        const key = `${d}_effect` as const
        return (
          <Field key={d} label={`${label}への作用`}>
            <div className="flex gap-2">
              {EFFECT_OPTIONS.map((o) => (
                <Chip key={o.v} active={f[key] === o.v} onClick={() => set(key, o.v as -1 | 0 | 1)}>{o.label}</Chip>
              ))}
            </div>
          </Field>
        )
      })}
      <Field label="グナ（性質）">
        <input value={f.guna ?? ''} onChange={(e) => set('guna', e.target.value)} placeholder="重・軽・油・乾…" className={inputCls} />
      </Field>
      <Field label="カルマ（働き）">
        <textarea value={f.karma ?? ''} onChange={(e) => set('karma', e.target.value)} className={textCls} rows={2} />
      </Field>

      {/* 東洋医学 */}
      <SectionTitle>東洋医学・薬膳</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="四気">
          <input value={f.tcm_nature ?? ''} onChange={(e) => set('tcm_nature', e.target.value)} placeholder="温/平/涼…" className={inputCls} />
        </Field>
        <Field label="五味">
          <input value={f.tcm_taste ?? ''} onChange={(e) => set('tcm_taste', e.target.value)} placeholder="甘/苦/辛…" className={inputCls} />
        </Field>
      </div>
      <Field label="帰経">
        <input value={f.tcm_meridian ?? ''} onChange={(e) => set('tcm_meridian', e.target.value)} placeholder="肺/脾/胃…" className={inputCls} />
      </Field>
      <Field label="薬膳的な効能">
        <textarea value={f.tcm_effect ?? ''} onChange={(e) => set('tcm_effect', e.target.value)} className={textCls} rows={2} />
      </Field>

      {/* 伝承・民間知 */}
      <SectionTitle>伝承・民間知</SectionTitle>
      <Field label="地域">
        <div className="flex gap-2">
          {REGION_OPTIONS.map((r) => (
            <Chip key={r} active={(f.folklore_region ?? []).includes(r)} onClick={() => toggleArr('folklore_region', r)}>{r}</Chip>
          ))}
        </div>
      </Field>
      <Field label="伝承・民間の効能">
        <textarea value={f.folklore ?? ''} onChange={(e) => set('folklore', e.target.value)} className={textCls} rows={3} />
      </Field>

      {/* 現代栄養・注意 */}
      <SectionTitle>栄養・注意</SectionTitle>
      <Field label="現代栄養データ">
        <textarea value={f.nutrition ?? ''} onChange={(e) => set('nutrition', e.target.value)} className={textCls} rows={2} />
      </Field>
      <Field label="注意（食べ合わせ・毒性など）">
        <textarea value={f.caution ?? ''} onChange={(e) => set('caution', e.target.value)} className={textCls} rows={2} />
      </Field>

      {/* メタ */}
      <SectionTitle>出典・メモ</SectionTitle>
      <Field label="出典">
        <div className="flex gap-2">
          {SOURCE_OPTIONS.map((s) => (
            <Chip key={s} active={f.source === s} onClick={() => set('source', s)}>{s}</Chip>
          ))}
        </div>
      </Field>
      <Field label="メモ">
        <textarea value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} className={textCls} rows={2} />
      </Field>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="flex-1 rounded-full border border-[#d8cdb8] py-3 text-sm text-[#8a7d64]"
        >
          キャンセル
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-full bg-[#a99878] py-3 text-sm text-white disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-3 py-2.5 text-sm outline-none'
const textCls = 'w-full rounded-xl border border-[#e4ddd0] bg-[#faf7f1] px-3 py-2.5 text-sm outline-none resize-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#8a7d64]">{label}</label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="border-b border-[#e4ddd0] pb-1 pt-3 text-sm text-[#a99878]">{children}</h2>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
        active ? 'bg-[#a99878] text-white' : 'bg-[#efe8da] text-[#8a7d64]'
      }`}
    >
      {children}
    </button>
  )
}
