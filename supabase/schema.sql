-- 日次記録テーブル
create table daily_records (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  energy_level integer check (energy_level between 1 and 10),
  agni integer check (agni between 1 and 10),
  bowel_movement boolean default false,
  sleep_hours numeric(4,1),
  soxai_score integer,
  hrv integer,
  weight numeric(5,2),
  body_fat numeric(5,2),
  tier1_score integer check (tier1_score between 0 and 5),
  tier2_score integer check (tier2_score between 0 and 5),
  tier3_score integer check (tier3_score between 0 and 4),
  calories integer,
  note text,
  created_at timestamp with time zone default now()
);

-- 習慣マスターテーブル
create table habits (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tier integer not null check (tier between 1 and 3),
  emoji text,
  sort_order integer default 0
);

-- 習慣ログテーブル（毎日のチェック）
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  habit_id uuid references habits(id) on delete cascade,
  completed boolean default false,
  created_at timestamp with time zone default now(),
  unique(date, habit_id)
);

-- 食事ログテーブル
create table meal_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text,
  calories_estimate integer,
  kapha_score text check (kapha_score in ('excellent', 'good', 'caution', 'avoid')),
  pitta_score text check (pitta_score in ('excellent', 'good', 'caution', 'avoid')),
  advice text,
  image_url text,
  created_at timestamp with time zone default now()
);

-- 習慣マスターデータ挿入
insert into habits (name, tier, emoji, sort_order) values
  ('白湯を飲む', 1, '☕', 1),
  ('昼食を一番大きくする', 1, '🌞', 2),
  ('間食しない', 1, '🚫', 3),
  ('18〜19時までに夕食', 1, '🌆', 4),
  ('22〜23時までに就寝', 1, '🌙', 5),
  ('運動（30〜60分）', 2, '🏊', 6),
  ('舌磨き', 2, '👅', 7),
  ('オイルプリング', 2, '🫙', 8),
  ('食後散歩', 2, '🚶', 9),
  ('ハーブティー', 2, '🌿', 10),
  ('ガルシャナ（乾布摩擦）', 3, '✋', 11),
  ('アビヤンガ', 3, '💆', 12),
  ('瞑想・呼吸法', 3, '🧘', 13),
  ('デジタルデトックス', 3, '📵', 14);

-- インデックス
create index daily_records_date_idx on daily_records(date);
create index habit_logs_date_idx on habit_logs(date);
create index meal_logs_date_idx on meal_logs(date);
