'use client'

import { useState, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'

type TimelineItem = {
  id: string
  time_label: string
  title: string
  description: string | null
  sort_order: number
}

type EditState = {
  id: string | null // null = new item
  time_label: string
  title: string
  description: string
}

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/timeline')
    const { data } = await res.json()
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startNew() {
    setEditing({ id: null, time_label: '', title: '', description: '' })
  }

  function startEdit(item: TimelineItem) {
    setEditing({
      id: item.id,
      time_label: item.time_label,
      title: item.title,
      description: item.description ?? '',
    })
  }

  async function saveEdit() {
    if (!editing || !editing.title.trim() || !editing.time_label.trim()) return
    setSaving(true)
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0
      await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id || undefined,
          time_label: editing.time_label.trim(),
          title: editing.title.trim(),
          description: editing.description.trim() || null,
          sort_order: editing.id
            ? items.find((i) => i.id === editing.id)?.sort_order
            : maxOrder + 10,
        }),
      })
      setEditing(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    await fetch(`/api/timeline?id=${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  async function moveItem(id: string, direction: 'up' | 'down') {
    const idx = items.findIndex((i) => i.id === id)
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= items.length) return

    const a = items[idx]
    const b = items[target]

    // Swap sort_orders
    await Promise.all([
      fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, time_label: a.time_label, title: a.title, description: a.description, sort_order: b.sort_order }),
      }),
      fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, time_label: b.time_label, title: b.title, description: b.description, sort_order: a.sort_order }),
      }),
    ])
    await load()
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-teal-900 text-white px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold">1日のタイムライン</h1>
        <p className="text-teal-200 text-sm mt-0.5">ディナチャリヤ（日課）を自由に編集</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-300 border-t-teal-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Time */}
                <div className="min-w-[72px]">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                    {item.time_label}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 text-sm">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{item.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={idx === 0}
                      className="text-stone-300 disabled:opacity-20 px-1 py-0.5 text-xs leading-none"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={idx === items.length - 1}
                      className="text-stone-300 disabled:opacity-20 px-1 py-0.5 text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-stone-400 active:text-teal-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    className="p-2 text-stone-300 active:text-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add button */}
          <button
            onClick={startNew}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 font-semibold text-sm active:bg-stone-50 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新しい項目を追加
          </button>
        </div>
      )}

      {/* Edit / Add modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setEditing(null)}>
          <div
            className="w-full bg-white rounded-t-3xl p-6 pb-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-stone-800">
              {editing.id ? '項目を編集' : '新しい項目'}
            </h2>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">時間帯</label>
              <input
                type="text"
                value={editing.time_label}
                onChange={(e) => setEditing({ ...editing, time_label: e.target.value })}
                placeholder="例: 6:00 / 12:00-14:00"
                className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-400/40"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">タイトル</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="例: 白湯を飲む"
                className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-400/40"
              />
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">メモ（任意）</label>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="詳細やポイントを入力..."
                rows={2}
                className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-400/40 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-semibold text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editing.title.trim() || !editing.time_label.trim()}
                className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-semibold text-sm disabled:opacity-40"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <p className="text-sm font-semibold text-stone-800 mb-1">この項目を削除しますか？</p>
            <p className="text-xs text-stone-400 mb-4">元には戻せません</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-semibold text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteItem(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
