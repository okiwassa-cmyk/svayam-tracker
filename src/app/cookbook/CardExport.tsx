'use client'

import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'

const CARD_W = 540

// カードを540px固定で描画しつつ、プレビューは画面幅に合わせて縮小表示する。
// 書き出し(toPng)は縮小前の540pxノードを対象にするので解像度は保たれる。
export default function CardExport({
  filename,
  children,
}: {
  filename: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null) // 実カード(540px・書き出し対象)
  const holderRef = useRef<HTMLDivElement>(null) // 利用可能幅を測る
  const [scale, setScale] = useState(1)
  const [boxH, setBoxH] = useState<number>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function update() {
      const avail = holderRef.current?.clientWidth ?? CARD_W
      const s = Math.min(1, avail / CARD_W)
      setScale(s)
      const natH = ref.current?.offsetHeight ?? 0
      setBoxH(natH * s)
    }
    update()
    const ro = new ResizeObserver(update)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  async function download() {
    if (!ref.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
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
      <div ref={holderRef} className="w-full overflow-hidden" style={{ height: boxH }}>
        <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
          <div ref={ref} className="w-[540px]">
            {children}
          </div>
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
