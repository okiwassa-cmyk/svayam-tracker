'use client'

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'

// カードのDOMを受け取り、PNGとしてダウンロードするラッパー
export default function CardExport({
  filename,
  children,
}: {
  filename: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  async function download() {
    if (!ref.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
        // 画像crossOrigin対策（Supabaseの公開URLはCORS可）
        fetchRequestInit: { mode: 'cors' },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${filename}.png`
      a.click()
    } catch (e) {
      alert('画像化に失敗しました: ' + String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div ref={ref} className="mx-auto w-[540px]">
          {children}
        </div>
      </div>
      <button
        onClick={download}
        disabled={busy}
        className="w-full rounded-full bg-[#a99878] py-3 text-sm text-white disabled:opacity-50"
      >
        {busy ? '書き出し中…' : '画像として保存'}
      </button>
    </div>
  )
}
