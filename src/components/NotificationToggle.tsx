'use client'

import { useState, useEffect } from 'react'

export default function NotificationToggle() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'granted' | 'default'>('loading')
  const [subscribed, setSubscribed] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    setStatus(Notification.permission as 'denied' | 'granted' | 'default')
    // Register SW
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    })
  }, [])

  async function enable() {
    setWorking(true)
    try {
      const permission = await Notification.requestPermission()
      setStatus(permission as 'granted' | 'denied' | 'default')
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setSubscribed(true)
    } finally {
      setWorking(false)
    }
  }

  async function disable() {
    setWorking(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setWorking(false)
    }
  }

  if (status === 'loading') return null
  if (status === 'unsupported') return (
    <p className="text-xs text-stone-400">このブラウザは通知に対応していません（ホーム画面に追加後に利用可能）</p>
  )
  if (status === 'denied') return (
    <p className="text-xs text-red-400">通知がブロックされています。iPhoneの設定 → Safari → 通知で許可してください</p>
  )

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-stone-700">プッシュ通知</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {subscribed ? '7:00 / 12:00 / 21:00 に通知が届きます' : 'オフ'}
        </p>
      </div>
      <button
        onClick={subscribed ? disable : enable}
        disabled={working}
        className={`relative w-12 h-7 rounded-full transition-colors ${subscribed ? 'bg-teal-600' : 'bg-stone-200'} disabled:opacity-50`}
      >
        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${subscribed ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}
