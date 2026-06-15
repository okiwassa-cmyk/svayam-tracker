import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel Cron at specified times (JST = UTC+9)
// 21:00 UTC = 6:00 JST (breakfast)
// 01:30 UTC = 10:30 JST (lunch prep)

const NOTIFICATIONS: Record<string, { title: string; body: string; url: string }> = {
  '21': { title: '🍵 朝食の時間です', body: '白湯を飲んで、朝の記録もつけましょう', url: '/morning' },
  '1':  { title: '🌿 昼ごはんの準備', body: '今日一番大きい食事を。食後は記録を', url: '/meal' },
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
