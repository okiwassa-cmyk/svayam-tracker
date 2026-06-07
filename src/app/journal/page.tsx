'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'
import type { MealLog } from '@/lib/types'

type Message = { role: 'user' | 'assistant'; content: string }

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

const SUGGESTIONS = [
  '今日の昼ごはんに何がおすすめ？',
  '朝は何を食べればいい？',
  '夕食を軽くするにはどうすれば？',
  '外食するとしたら何がいい？',
  'おやつ食べていい？',
]

export default function JournalPage() {
  const today = getTodayJST()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadMeals = useCallback(async () => {
    const res = await fetch(`/api/meal?date=${today}`)
    const { data } = await res.json()
    setTodayMeals(data ?? [])
  }, [today])

  useEffect(() => { loadMeals() }, [loadMeals])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || sending) return

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, todayMeals }),
      })
      const { reply, error } = await res.json()
      if (error) throw new Error(error)
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'エラーが発生しました。もう一度試してください。' }])
    } finally {
      setSending(false)
    }
  }

  const mealTypeLabel: Record<string, string> = {
    breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
  }

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <header className="bg-stone-600 text-white px-4 pt-12 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">食事相談</h1>
        <p className="text-stone-300 text-sm mt-0.5">カファ・ピッタ専門アドバイザーに相談</p>
      </header>

      {/* Today's meals context bar */}
      {todayMeals.length > 0 && (
        <div className="bg-stone-50 border-b border-stone-100 px-4 py-2 flex-shrink-0">
          <p className="text-xs text-stone-400 mb-1">今日食べたもの</p>
          <div className="flex gap-2 flex-wrap">
            {todayMeals.map((m) => (
              <span key={m.id} className="text-xs bg-white border border-stone-200 rounded-lg px-2 py-0.5 text-stone-600">
                {mealTypeLabel[m.meal_type] ?? m.meal_type}：{m.description}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-stone-600 leading-relaxed">
                こんにちは！カファ・ピッタ体質に合った食事のご相談をどうぞ。今日食べるものの提案、食材の選び方、食事タイミングなど何でも聞いてください。
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-2">よく聞かれること</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-600 active:bg-stone-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-stone-700 text-white rounded-br-sm'
                  : 'bg-white text-stone-700 shadow-sm rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-stone-100 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="食事について相談する..."
            rows={1}
            className="flex-1 text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-stone-400/30 resize-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-700 text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
