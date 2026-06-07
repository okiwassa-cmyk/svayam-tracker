import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel Cron at specified times (JST = UTC+9)
// 22:00 UTC = 7:00 JST (morning)
// 03:00 UTC = 12:00 JST (noon)
// 12:00 UTC = 21:00 JST (evening)

const NOTIFICATIONS: Record<string, { title: string; body: string; url: string }> = {
  '21': { title: '🌅 朝のディナチャリア', body: '朝日を浴びる・舌磨き・歯磨き・ガヴァラ', url: '/habits' },
  '22': { title: '☀️ おはようございます', body: '白湯を飲んで、朝の記録をつけましょう', url: '/morning' },
  '3':  { title: '🌿 昼食の時間です', body: '今日一番大きい食事を。食後は記録を', url: '/meal' },
  '12': { title: '🌙 夜の記録', body: '今日の習慣チェックと夜の記録を忘れずに', url: '/evening' },
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hour = new Date().getUTCHours().toString()
  const notification = NOTIFICATIONS[hour]
  if (!notification) return NextResponse.json({ skipped: true })

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://svayam-tracker.vercel.app'
  await fetch(`${base}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  })

  return NextResponse.json({ sent: true, hour, ...notification })
}
