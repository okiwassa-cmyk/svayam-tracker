import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/recipes            → 全件（一覧）
// GET /api/recipes?id=xxx      → 1件
// GET /api/recipes?q=キチディ   → 名前で検索
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q')

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  let query = supabaseAdmin.from('recipes').select('*')
  if (q) {
    query = query.ilike('name', `%${q}%`)
  }
  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/recipes → 新規登録
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .insert(sanitize(body))
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/recipes → 更新
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates = sanitize(body)
  updates.updated_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/recipes?id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('recipes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

const FIELDS = [
  'name', 'category', 'subcategory', 'servings', 'cook_time', 'difficulty',
  'description', 'photo_url', 'ingredients', 'steps', 'tags', 'season',
  'favorite', 'is_paid', 'published',
  'vata_effect', 'pitta_effect', 'kapha_effect', 'rasa', 'virya',
  'advice', 'note', 'source',
]
function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f]
  }
  return out
}
