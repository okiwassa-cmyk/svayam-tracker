import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const COLUMN: Record<string, string> = {
  asukken: 'asukken_photo_url',
  tongue: 'tongue_photo_url',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const date = formData.get('date') as string | null
    const kind = String(formData.get('kind') ?? 'asukken')

    if (!file || !date) {
      return NextResponse.json({ error: 'file and date required' }, { status: 400 })
    }
    const column = COLUMN[kind]
    if (!column) {
      return NextResponse.json({ error: 'unknown kind' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${kind}/${date}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error } = await supabaseAdmin.storage
      .from('photos')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from('photos').getPublicUrl(path)

    // Also update the daily_records row
    await supabaseAdmin
      .from('daily_records')
      .upsert({ date, [column]: publicUrl }, { onConflict: 'date' })

    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
