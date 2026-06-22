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
