'use client'

import { useState, useEffect, useCallback } from 'react'

type BowelLog = {
  id: string
  date: string
  quality: string
  note: string | null
  created_at: string
}

const qualityOptions = [
  { value: 'excellent', label: '◎ 理想的', desc: '形よく・スムーズ', color: 'bg-green-500 text-white' },
  { value: 'good',      label: '○ 良好',   desc: '普通の状態',       color: 'bg-blue-500 text-white' },
  { value: 'soft',      label: '△ 軟便',   desc: '少し柔らかめ',     color: 'bg-amber-500 text-white' },
  { value: 'loose',     label: '▽ 下痢',   desc: '水っぽい',         color: 'bg-orange-500 text-white' },
  { value: 'constipated', label: '× 便秘', desc: '出にくい・硬い',   color: 'bg-red-500 text-white' },
]

export default function BowelLogger({ date }: { date: string }) {
  const [logs, setLogs] = useState<BowelLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/bowel?date=${date}`)
    const { data } = await res.json()
    setLogs(data ?? [])
  }, [date])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!selectedQuality) return
    setSaving(true)
    await fetch('/api/bowel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, quality: selectedQuality, note: note || null }),
    })
    setSelectedQuality(null)
    setNote('')
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/bowel?id=${id}`, { method: 'DELETE' })
    load()
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const qualityMap = Object.fromEntries(qualityOptions.map((q) => [q.value, q]))

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-600">🚽 排便記録</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold active:scale-95"
        >
          + 記録する
        </button>
      </div>

      {/* 既存ログ */}
      {logs.length > 0 && (
        <div className="space-y-2 mb-3">
          {logs.map((log) => {
            const q = qualityMap[log.quality]
            return (
              <div key={log.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${q?.color ?? 'bg-stone-200'}`}>
                    {q?.label ?? log.quality}
                  </span>
                  {log.note && <span className="text-xs text-stone-500">{log.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{formatTime(log.created_at)}</span>
                  <button
                    onClick={() => remove(log.id)}
                    className="text-stone-300 text-xs active:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logs.length === 0 && !showForm && (
        <p className="text-xs text-stone-400 mb-3">まだ記録がありません</p>
      )}

      {/* 入力フォーム */}
      {showForm && (
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-500 font-medium">状態を選択：</p>
          <div className="grid grid-cols-1 gap-2">
            {qualityOptions.map((q) => (
              <button
                key={q.value}
                onClick={() => setSelectedQuality(q.value)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                  selectedQuality === q.value
                    ? q.color + ' shadow-md'
                    : 'bg-stone-50 text-stone-600 active:bg-stone-100'
                }`}
              >
                <span className="font-semibold">{q.label}</span>
                <span className={`text-xs ${selectedQuality === q.value ? 'text-white/80' : 'text-stone-400'}`}>
                  {q.desc}
                </span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-300"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setSelectedQuality(null); setNote('') }}
              className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-500 text-sm font-semibold"
            >
              キャンセル
            </button>
            <button
              onClick={save}
              disabled={!selectedQuality || saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
                selectedQuality && !saving ? 'bg-green-600 active:scale-95' : 'bg-stone-300'
              }`}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
