export type DailyRecord = {
  id: string
  date: string
  energy_level: number | null
  agni: number | null
  bowel_movement: boolean
  sleep_hours: number | null
  soxai_score: number | null
  hrv: number | null
  weight: number | null
  body_fat: number | null
  waist_cm: number | null
  tier1_score: number | null
  tier2_score: number | null
  tier3_score: number | null
  calories: number | null
  note: string | null
  morning_clarity: number | null
  tongue_coating: number | null
  tongue_color: number | null
  morning_hunger: number | null
  dinner_time: number | null
  dinner_amount: number | null
  alcohol: number | null
  dinacharya_flags: Record<string, boolean> | null
  asukken_photo_url: string | null
  created_at: string
}

export type UserSettings = {
  id: number
  start_date: string | null
  target_weight: number | null
  target_waist: number | null
  fasting_day: number | null
  wake_time: string | null
  lunch_time: string | null
  sleep_time: string | null
  updated_at: string
}

export type Habit = {
  id: string
  name: string
  tier: 1 | 2 | 3
  emoji: string
  sort_order: number
  frequency: number
  days_of_week: string | null
}

export type HabitLog = {
  id: string
  date: string
  habit_id: string
  completed: boolean
  created_at: string
}

export type MealLog = {
  id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string | null
  calories_estimate: number | null
  kapha_score: 'excellent' | 'good' | 'caution' | 'avoid' | null
  pitta_score: 'excellent' | 'good' | 'caution' | 'avoid' | null
  rasa: string | null
  advice: string | null
  image_url: string | null
  user_note: string | null
  user_input: string | null
  logged_at: string | null
  skipped: boolean
  hungry_before: boolean | null
  created_at: string
}

export type HabitWithLog = Habit & { completed: boolean; log_id?: string }

// ドーシャ作用: -1=鎮める / 0=中庸 / 1=増やす
export type DoshaEffect = -1 | 0 | 1

// 六味
export type Rasa = '甘' | '酸' | '塩' | '辛' | '苦' | '渋'

// ヴィーリヤ（温冷）
export type Virya = '温性' | '熱性' | '冷性' | '中性'

export type IngredientSource = '一次ソース' | '推定' | '推定(AI)'

// 食材事典
export type Ingredient = {
  id: string
  name: string
  sanskrit: string | null
  aliases: string | null
  category: string | null
  photo_url: string | null
  rasa: string[]
  virya: string | null
  vata_effect: DoshaEffect
  pitta_effect: DoshaEffect
  kapha_effect: DoshaEffect
  guna: string | null
  karma: string | null
  tcm_nature: string | null
  tcm_taste: string | null
  tcm_meridian: string | null
  tcm_effect: string | null
  folklore: string | null
  folklore_region: string[]
  nutrition: string | null
  caution: string | null
  source: string
  note: string | null
  favorite: boolean
  created_at: string
  updated_at: string
}

// レシピの材料1行
export type RecipeIngredient = {
  ingredient_id: string | null
  name: string
  amount: string | null
  unit: string | null
  section: string | null
}

// レシピの手順1行
export type RecipeStep = {
  text: string
  image_url?: string | null
}

// レシピ
export type Recipe = {
  id: string
  name: string
  category: string | null
  subcategory: string | null
  servings: number | null
  cook_time: number | null
  difficulty: string | null
  description: string | null
  photo_url: string | null
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  tags: string[]
  season: string[]
  favorite: boolean
  is_paid: boolean
  published: boolean
  vata_effect: DoshaEffect | null
  pitta_effect: DoshaEffect | null
  kapha_effect: DoshaEffect | null
  rasa: string[]
  virya: string | null
  advice: string | null
  note: string | null
  source: string | null
  created_at: string
  updated_at: string
}
