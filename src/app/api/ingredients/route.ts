import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/ingredients            → 全件（一覧）
// GET /api/ingredients?id=xxx      → 1件
// GET /api/ingredients?q=ゴーヤ     → 名前・別名で検索
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q')

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  let query = supabaseAdmin.from('ingredients').select('*')
  if (q) {
    query = query.or(`name.ilike.%${q}%,aliases.ilike.%${q}%`)
  }
  const { data, error } = await query.order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/ingredients → 新規登録
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('ingredients')
    .insert(sanitize(body))
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/ingredients → 更新
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates = sanitize(body)
  updates.updated_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('ingredients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/ingredients?id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('ingredients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// 許可カラムだけ通す（idやcreated_atを弾く）
const FIELDS = [
  'name', 'sanskrit', 'aliases', 'category', 'photo_url', 'rasa', 'virya',
  'vata_effect', 'pitta_effect', 'kapha_effect', 'guna', 'karma',
  'tcm_nature', 'tcm_taste', 'tcm_meridian', 'tcm_effect',
  'folklore', 'folklore_region', 'nutrition', 'caution',
  'source', 'note', 'favorite',
]
function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f]
  }
  return out
}
