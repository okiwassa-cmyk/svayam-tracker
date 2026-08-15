// 記録の時刻はJSTで扱う。DBには UTC の ISO で入れる
export function timeInJST(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function isoForDateTime(date: string, time: string) {
  const [h, m] = time.split(':').map(Number)
  return new Date(
    `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`
  ).toISOString()
}

export function nowTimeJST() {
  return timeInJST(new Date().toISOString())
}
