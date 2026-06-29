-- =============================================================================
-- pklotery_01 — Supabase (PostgreSQL) FULL SETUP
-- =============================================================================
-- วิธีรันใน Supabase SQL Editor (ครั้งแรก):
--   1. Copy ทั้งไฟล์นี้ → Run once
--   2. Dashboard → Authentication → Email → ปิด "Confirm email"
--   3. สมัครสมาชิกผ่านแอป (Supabase Auth) — ไม่ใช้ demo user ใน seed โดยตรง
--
-- รันซ้ำ: ใช้ ON CONFLICT / WHERE NOT EXISTS — ปลอดภัยสำหรับ seed
--          Policies จะ DROP แล้วสร้างใหม่
--
-- ตารางทั้งหมด (24):
--   site_settings, site_banners, winning_feed, activities, vip_tiers, game_rules
--   users, user_sessions, user_bank_cards, user_crypto_wallets, recharge_channels
--   withdraw_settings, money_categories, user_money_logs, deposit_orders, withdraw_orders
--   game_categories, games, play_groups, play_categories, play_items
--   game_issues, draw_results, bet_records, user_notices, user_notice_reads
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE bet_status AS ENUM ('0', '1');       -- 0=pending, 1=settled
  CREATE TYPE win_flag AS ENUM ('0', '1');
  CREATE TYPE withdraw_type AS ENUM ('bank', 'crypto');
  CREATE TYPE order_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  CREATE TYPE recharge_channel_type AS ENUM ('bank', 'crypto');
  CREATE TYPE notice_scope AS ENUM ('broadcast', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Site / CMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notice          TEXT,
  service_url     VARCHAR(512) DEFAULT '/service-frame.html',
  currency        VARCHAR(8) NOT NULL DEFAULT '฿',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_banners (
  id              BIGSERIAL PRIMARY KEY,
  image           VARCHAR(512) NOT NULL,
  url             VARCHAR(512),
  sort            INT NOT NULL DEFAULT 0,
  status          SMALLINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS winning_feed (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT,
  games_id        BIGINT,
  games_name      VARCHAR(128),
  username        VARCHAR(64),
  win_amount      NUMERIC(18, 2) NOT NULL DEFAULT 0,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS activities (
  id              BIGSERIAL PRIMARY KEY,
  category_id     SMALLINT NOT NULL,              -- 68=โปรโมชั่น, 69=กิจกรรม
  title           VARCHAR(255) NOT NULL,
  text            TEXT,
  images          VARCHAR(512),
  status          SMALLINT NOT NULL DEFAULT 1,
  sort            INT NOT NULL DEFAULT 0,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS vip_tiers (
  level             SMALLINT PRIMARY KEY,
  image             VARCHAR(512),
  deposit_required  NUMERIC(18, 2) NOT NULL,
  sort              INT NOT NULL DEFAULT 0
);

-- game_rules สร้างหลังตาราง games (ด้านล่าง)

-- ---------------------------------------------------------------------------
-- Users & auth (custom token — mirrors reference; optional link to auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                  BIGSERIAL PRIMARY KEY,
  auth_user_id        UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username            CITEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL DEFAULT '',
  nickname            VARCHAR(64),
  avatar              VARCHAR(512),
  money               NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (money >= 0),
  pay_password_hash   TEXT,
  is_paypwd           BOOLEAN NOT NULL DEFAULT FALSE,
  day_win             NUMERIC(18, 2) NOT NULL DEFAULT 0,
  unsettled           NUMERIC(18, 2) NOT NULL DEFAULT 0,
  phone               VARCHAR(32),
  email               CITEXT,
  invite_code         VARCHAR(32) UNIQUE,
  invited_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status              SMALLINT NOT NULL DEFAULT 1,
  createtime          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updatetime          BIGINT
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           VARCHAR(128) NOT NULL UNIQUE,
  expires_at      BIGINT,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- ---------------------------------------------------------------------------
-- Payment instruments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_bank_cards (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name       VARCHAR(128) NOT NULL,
  bank_card       VARCHAR(64) NOT NULL,
  bank_username   VARCHAR(128) NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  UNIQUE (user_id, bank_card)
);

CREATE TABLE IF NOT EXISTS user_crypto_wallets (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address         VARCHAR(256) NOT NULL,
  remark          VARCHAR(128),
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  UNIQUE (user_id, address)
);

CREATE TABLE IF NOT EXISTS recharge_channels (
  id              BIGSERIAL PRIMARY KEY,
  type            recharge_channel_type NOT NULL,
  name            VARCHAR(64) NOT NULL,
  bank_name       VARCHAR(128),
  bank_username   VARCHAR(128),
  bank_card       VARCHAR(64),
  address         VARCHAR(256),
  qrcode          VARCHAR(512),
  notice          TEXT,
  quick_amounts   JSONB NOT NULL DEFAULT '[]'::JSONB,
  status          SMALLINT NOT NULL DEFAULT 1,
  sort            INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS withdraw_settings (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  withdraw_min    NUMERIC(18, 2) NOT NULL DEFAULT 100,
  withdraw_max    NUMERIC(18, 2) NOT NULL DEFAULT 50000,
  withdraw_fee    NUMERIC(18, 2) NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Wallet ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS money_categories (
  id              SMALLINT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL UNIQUE,
  name            VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_money_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     SMALLINT NOT NULL REFERENCES money_categories(id),
  money           NUMERIC(18, 2) NOT NULL,
  before_money    NUMERIC(18, 2),
  after_money     NUMERIC(18, 2),
  type            VARCHAR(64),
  remark          VARCHAR(255),
  ref_type        VARCHAR(32),
  ref_id          BIGINT,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS deposit_orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id      BIGINT REFERENCES recharge_channels(id) ON DELETE SET NULL,
  channel_type    recharge_channel_type NOT NULL DEFAULT 'bank',
  amount          NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  payer_name      VARCHAR(128),
  proof_image     VARCHAR(512),
  status          order_status NOT NULL DEFAULT 'pending',
  admin_note      TEXT,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  audittime       BIGINT
);

CREATE TABLE IF NOT EXISTS withdraw_orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            withdraw_type NOT NULL DEFAULT 'bank',
  bank_name       VARCHAR(128),
  bank_card       VARCHAR(256),
  bank_username   VARCHAR(128),
  amount          NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  fee             NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status          order_status NOT NULL DEFAULT 'pending',
  admin_note      TEXT,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  audittime       BIGINT
);

-- ---------------------------------------------------------------------------
-- Lottery
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_categories (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(64) NOT NULL,
  sort            INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
  id              BIGSERIAL PRIMARY KEY,
  category_id     BIGINT REFERENCES game_categories(id) ON DELETE SET NULL,
  code            VARCHAR(32) NOT NULL UNIQUE,
  name            VARCHAR(128) NOT NULL,
  image           VARCHAR(512),
  game_type       VARCHAR(16) NOT NULL DEFAULT 'pk10',
  description     TEXT,
  is_hot          BOOLEAN NOT NULL DEFAULT FALSE,
  status          SMALLINT NOT NULL DEFAULT 1,
  sort            INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_rules (
  id              BIGSERIAL PRIMARY KEY,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title           VARCHAR(128),
  content         TEXT NOT NULL,
  locale          VARCHAR(8) NOT NULL DEFAULT 'th',
  UNIQUE (games_id, locale)
);

CREATE TABLE IF NOT EXISTS play_groups (
  id              BIGSERIAL PRIMARY KEY,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  code            VARCHAR(32),
  name            VARCHAR(64) NOT NULL,
  sort            INT NOT NULL DEFAULT 0,
  UNIQUE (games_id, code)
);

CREATE TABLE IF NOT EXISTS play_categories (
  id              BIGSERIAL PRIMARY KEY,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name            VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS play_items (
  id              BIGSERIAL PRIMARY KEY,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  group_id        BIGINT NOT NULL REFERENCES play_groups(id) ON DELETE CASCADE,
  category_id     BIGINT REFERENCES play_categories(id) ON DELETE SET NULL,
  bet_content     VARCHAR(128) NOT NULL,
  label           VARCHAR(64),
  odds            NUMERIC(10, 4) NOT NULL,
  status          SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS game_issues (
  id                  BIGSERIAL PRIMARY KEY,
  games_id            BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  issue               VARCHAR(64) NOT NULL,
  draw_time           BIGINT NOT NULL,
  status              SMALLINT NOT NULL DEFAULT 0,
  bet_quick_amount    JSONB NOT NULL DEFAULT '["10","50","100","500","1000"]'::JSONB,
  UNIQUE (games_id, issue)
);

CREATE TABLE IF NOT EXISTS draw_results (
  id              BIGSERIAL PRIMARY KEY,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  issue           VARCHAR(64) NOT NULL,
  result          VARCHAR(255) NOT NULL,
  analyz_result   JSONB,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  UNIQUE (games_id, issue)
);

-- ---------------------------------------------------------------------------
-- Bets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bet_records (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  games_name      VARCHAR(128),
  issue           VARCHAR(64) NOT NULL,
  play_item_id    BIGINT REFERENCES play_items(id) ON DELETE SET NULL,
  category_name   VARCHAR(128),
  bet_content     VARCHAR(128) NOT NULL,
  amount          NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  win_amount      NUMERIC(18, 2) NOT NULL DEFAULT 0,
  odds            NUMERIC(10, 4),
  status          bet_status NOT NULL DEFAULT '0',
  status_text     VARCHAR(32),
  is_win          win_flag NOT NULL DEFAULT '0',
  is_win_text     VARCHAR(32),
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  settletime      BIGINT
);

-- ---------------------------------------------------------------------------
-- Messages / notices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_notices (
  id              BIGSERIAL PRIMARY KEY,
  scope           notice_scope NOT NULL DEFAULT 'broadcast',
  user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  content         TEXT NOT NULL,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS user_notice_reads (
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notice_id       BIGINT NOT NULL REFERENCES user_notices(id) ON DELETE CASCADE,
  read_at         BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  PRIMARY KEY (user_id, notice_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token);
CREATE INDEX IF NOT EXISTS idx_bank_cards_user ON user_bank_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user ON user_crypto_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_money_logs_user_time ON user_money_logs (user_id, createtime DESC);
CREATE INDEX IF NOT EXISTS idx_money_logs_category ON user_money_logs (category_id);
CREATE INDEX IF NOT EXISTS idx_bet_records_user_time ON bet_records (user_id, createtime DESC);
CREATE INDEX IF NOT EXISTS idx_bet_records_status ON bet_records (status);
CREATE INDEX IF NOT EXISTS idx_bet_records_games_issue ON bet_records (games_id, issue);
CREATE INDEX IF NOT EXISTS idx_draw_results_games ON draw_results (games_id, createtime DESC);
CREATE INDEX IF NOT EXISTS idx_game_issues_games ON game_issues (games_id, draw_time DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_orders_user ON deposit_orders (user_id, createtime DESC);
CREATE INDEX IF NOT EXISTS idx_withdraw_orders_user ON withdraw_orders (user_id, createtime DESC);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities (category_id, sort);
CREATE INDEX IF NOT EXISTS idx_notices_scope ON user_notices (scope, createtime DESC);

-- ---------------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------------

-- Apply balance change when money log is inserted (deposit/withdraw/bet/win)
CREATE OR REPLACE FUNCTION fn_apply_money_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before NUMERIC(18, 2);
BEGIN
  -- Skip balance mutation when seeding historical rows with explicit before/after
  IF NEW.before_money IS NOT NULL AND NEW.after_money IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT money INTO v_before FROM users WHERE id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', NEW.user_id;
  END IF;

  NEW.before_money := v_before;
  NEW.after_money := v_before + NEW.money;

  IF NEW.after_money < 0 THEN
    RAISE EXCEPTION 'insufficient balance for user %', NEW.user_id;
  END IF;

  UPDATE users
  SET money = NEW.after_money,
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_money_log ON user_money_logs;
CREATE TRIGGER trg_apply_money_log
  BEFORE INSERT ON user_money_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_apply_money_log();

-- Sync is_paypwd when pay password changes
CREATE OR REPLACE FUNCTION fn_sync_is_paypwd()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_paypwd := NEW.pay_password_hash IS NOT NULL AND NEW.pay_password_hash <> '';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_paypwd ON users;
CREATE TRIGGER trg_sync_is_paypwd
  BEFORE INSERT OR UPDATE OF pay_password_hash ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_is_paypwd();

-- Profit summary (matches GET /api/user/profits?start_time=&end_time=)
CREATE OR REPLACE FUNCTION fn_user_profits(
  p_user_id BIGINT,
  p_start_time BIGINT,
  p_end_time BIGINT
)
RETURNS TABLE (
  count_win_amount NUMERIC(18, 2),
  recharge_count   NUMERIC(18, 2),
  withdraw_count   NUMERIC(18, 2)
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE((
      SELECT SUM(win_amount)
      FROM bet_records
      WHERE user_id = p_user_id
        AND is_win = '1'
        AND createtime BETWEEN p_start_time AND p_end_time
    ), 0) AS count_win_amount,
    COALESCE((
      SELECT SUM(money)
      FROM user_money_logs
      WHERE user_id = p_user_id
        AND category_id = 14
        AND money > 0
        AND createtime BETWEEN p_start_time AND p_end_time
    ), 0) AS recharge_count,
    COALESCE((
      SELECT SUM(ABS(money))
      FROM user_money_logs
      WHERE user_id = p_user_id
        AND category_id = 15
        AND money < 0
        AND createtime BETWEEN p_start_time AND p_end_time
    ), 0) AS withdraw_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (Supabase) — idempotent policy recreate
-- ---------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bank_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_money_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE winning_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_settings" ON site_settings;
DROP POLICY IF EXISTS "public_read_banners" ON site_banners;
DROP POLICY IF EXISTS "public_read_winning_feed" ON winning_feed;
DROP POLICY IF EXISTS "public_read_activities" ON activities;
DROP POLICY IF EXISTS "public_read_vip_tiers" ON vip_tiers;
DROP POLICY IF EXISTS "public_read_game_categories" ON game_categories;
DROP POLICY IF EXISTS "public_read_games" ON games;
DROP POLICY IF EXISTS "public_read_play_groups" ON play_groups;
DROP POLICY IF EXISTS "public_read_play_categories" ON play_categories;
DROP POLICY IF EXISTS "public_read_play_items" ON play_items;
DROP POLICY IF EXISTS "public_read_game_issues" ON game_issues;
DROP POLICY IF EXISTS "public_read_draw_results" ON draw_results;
DROP POLICY IF EXISTS "public_read_game_rules" ON game_rules;
DROP POLICY IF EXISTS "public_read_recharge_channels" ON recharge_channels;
DROP POLICY IF EXISTS "public_read_withdraw_settings" ON withdraw_settings;
DROP POLICY IF EXISTS "public_read_money_categories" ON money_categories;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "bank_cards_own" ON user_bank_cards;
DROP POLICY IF EXISTS "crypto_wallets_own" ON user_crypto_wallets;
DROP POLICY IF EXISTS "money_logs_own" ON user_money_logs;
DROP POLICY IF EXISTS "bet_records_own" ON bet_records;
DROP POLICY IF EXISTS "deposit_orders_own" ON deposit_orders;
DROP POLICY IF EXISTS "withdraw_orders_own" ON withdraw_orders;
DROP POLICY IF EXISTS "notices_read" ON user_notices;
DROP POLICY IF EXISTS "notice_reads_own" ON user_notice_reads;

CREATE POLICY "public_read_site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "public_read_banners" ON site_banners FOR SELECT USING (status = 1);
CREATE POLICY "public_read_winning_feed" ON winning_feed FOR SELECT USING (true);
CREATE POLICY "public_read_activities" ON activities FOR SELECT USING (status = 1);
CREATE POLICY "public_read_vip_tiers" ON vip_tiers FOR SELECT USING (true);
CREATE POLICY "public_read_game_categories" ON game_categories FOR SELECT USING (true);
CREATE POLICY "public_read_games" ON games FOR SELECT USING (status = 1);
CREATE POLICY "public_read_play_groups" ON play_groups FOR SELECT USING (true);
CREATE POLICY "public_read_play_categories" ON play_categories FOR SELECT USING (true);
CREATE POLICY "public_read_play_items" ON play_items FOR SELECT USING (status = 1);
CREATE POLICY "public_read_game_issues" ON game_issues FOR SELECT USING (true);
CREATE POLICY "public_read_draw_results" ON draw_results FOR SELECT USING (true);
CREATE POLICY "public_read_game_rules" ON game_rules FOR SELECT USING (true);
CREATE POLICY "public_read_recharge_channels" ON recharge_channels FOR SELECT USING (status = 1);
CREATE POLICY "public_read_withdraw_settings" ON withdraw_settings FOR SELECT USING (true);
CREATE POLICY "public_read_money_categories" ON money_categories FOR SELECT USING (true);
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "bank_cards_own" ON user_bank_cards FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "crypto_wallets_own" ON user_crypto_wallets FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "money_logs_own" ON user_money_logs FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "bet_records_own" ON bet_records FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "deposit_orders_own" ON deposit_orders FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "withdraw_orders_own" ON withdraw_orders FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "notices_read" ON user_notices FOR SELECT
  USING (scope = 'broadcast' OR user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
CREATE POLICY "notice_reads_own" ON user_notice_reads FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed: lookup tables
-- ---------------------------------------------------------------------------
INSERT INTO money_categories (id, code, name) VALUES
  (14, 'deposit', 'ฝากเงิน'),
  (15, 'withdraw', 'ถอนเงิน'),
  (19, 'bet_win', 'ชนะเดิมพัน'),
  (20, 'bet_stake', 'เดิมพัน')
ON CONFLICT (id) DO NOTHING;

INSERT INTO withdraw_settings (id, withdraw_min, withdraw_max, withdraw_fee) VALUES
  (1, 100, 50000, 0)
ON CONFLICT (id) DO UPDATE SET
  withdraw_min = EXCLUDED.withdraw_min,
  withdraw_max = EXCLUDED.withdraw_max,
  withdraw_fee = EXCLUDED.withdraw_fee;

INSERT INTO site_settings (id, notice, service_url, currency) VALUES
  (
    1,
    'ยินดีต้อนรับสู่แพลตฟอร์มหวยออนไลน์ — ฝาก-ถอนอัตโนมัติ 24 ชม. โปรดเล่นอย่างมีสติ',
    '/service-frame.html',
    '฿'
  )
ON CONFLICT (id) DO UPDATE SET
  notice = EXCLUDED.notice,
  service_url = EXCLUDED.service_url,
  currency = EXCLUDED.currency;

INSERT INTO vip_tiers (level, image, deposit_required, sort) VALUES
  (1, '/assets/bonus/vip-1.png', 50000, 1),
  (2, '/assets/bonus/vip-2.png', 100000, 2),
  (3, '/assets/bonus/vip-3.png', 300000, 3),
  (4, '/assets/bonus/vip-4.png', 800000, 4),
  (5, '/assets/bonus/vip-5.png', 3000000, 5),
  (6, '/assets/bonus/vip-6.png', 8000000, 6)
ON CONFLICT (level) DO UPDATE SET
  image = EXCLUDED.image,
  deposit_required = EXCLUDED.deposit_required;

-- ---------------------------------------------------------------------------
-- Seed: games (matches src/services/api.ts)
-- ---------------------------------------------------------------------------
INSERT INTO game_categories (id, name, sort) VALUES
  (1, 'PK10', 1),
  (2, 'หวยอื่นๆ', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('game_categories', 'id'), (SELECT COALESCE(MAX(id), 1) FROM game_categories));

INSERT INTO games (id, category_id, code, name, image, game_type, description, is_hot, sort) VALUES
  (1, 1, 'df_pk10',   'PK10 10 นาที',      '/assets/games/df_pk10.png',   'pk10',     'แทง PK10 รอบ 10 นาที', TRUE,  1),
  (2, 2, 'df_k3',     'K3',                 '/assets/games/df_k3.png',     'k3',       'เกม K3 ทายผลลูกเต๋า', TRUE,  2),
  (3, 2, 'xam_6',     'Mark Six (ฮ่องกง)',  '/assets/games/xam_6.png',     'marksix',  'หวยฮ่องกง Mark Six', TRUE,  3),
  (4, 2, 'xy_28',     'Lucky 28',           '/assets/games/xy_28.png',     'lucky28',  'Lucky 28 ทายผลรวม', TRUE,  4),
  (5, 1, 'df_pk10_3', 'PK10 3 นาที',       '/assets/games/df_pk10_3.png', 'pk10',     'แทง PK10 รอบ 3 นาที', FALSE, 5),
  (6, 1, 'df_pk10_5', 'PK10 5 นาที',       '/assets/games/df_pk10_5.png', 'pk10',     'แทง PK10 รอบ 5 นาที', FALSE, 6),
  (7, 2, 'df_ssc',    'หวยรัฐบาล',          '/assets/games/df_ssc.png',    'ssc',      'หวยรัฐบาลไทย', FALSE, 7)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  image = EXCLUDED.image,
  game_type = EXCLUDED.game_type,
  description = EXCLUDED.description,
  is_hot = EXCLUDED.is_hot;

SELECT setval(pg_get_serial_sequence('games', 'id'), (SELECT COALESCE(MAX(id), 1) FROM games));

-- Play groups: PK10
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'lm', '两面盘', 1 FROM games g WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
ON CONFLICT (games_id, code) DO NOTHING;

INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'gy', '冠亚军和', 2 FROM games g WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
ON CONFLICT (games_id, code) DO NOTHING;

-- Play groups: K3, Mark Six, Lucky 28, SSC
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'hz', '和值', 1 FROM games g WHERE g.code = 'df_k3'
ON CONFLICT (games_id, code) DO NOTHING;

INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'lm', '两面', 1 FROM games g WHERE g.code = 'xam_6'
ON CONFLICT (games_id, code) DO NOTHING;

INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'lm28', '两面盘', 1 FROM games g WHERE g.code = 'xy_28'
ON CONFLICT (games_id, code) DO NOTHING;

INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'ball1', '第一球', 1 FROM games g WHERE g.code = 'df_ssc'
ON CONFLICT (games_id, code) DO NOTHING;

-- Play items helper: PK10 两面盘
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm'
CROSS JOIN (VALUES
  ('big', 'ใหญ่', 1.98), ('small', 'เล็ก', 1.98),
  ('odd', 'คี่', 1.98), ('even', 'คู่', 1.98),
  ('dragon', 'มังกร', 1.98), ('tiger', 'เสือ', 1.98)
) AS v(bet_content, label, odds)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- PK10 冠亚军和
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'gy'
CROSS JOIN (VALUES
  ('gy_big', 'ใหญ่', 2.1), ('gy_small', 'เล็ก', 2.1),
  ('gy_odd', 'คี่', 2.1), ('gy_even', 'คู่', 2.1)
) AS v(bet_content, label, odds)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- K3 和值
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz'
CROSS JOIN (VALUES
  ('k3_big', 'ใหญ่', 1.98), ('k3_small', 'เล็ก', 1.98),
  ('k3_odd', 'คี่', 1.98), ('k3_even', 'คู่', 1.98)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- Mark Six / Lucky 28 / SSC 两面
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('lm', 'lm28', 'ball1')
CROSS JOIN (VALUES
  ('big', 'ใหญ่', 1.98), ('small', 'เล็ก', 1.98),
  ('odd', 'คี่', 1.98), ('even', 'คู่', 1.98)
) AS v(bet_content, label, odds)
WHERE g.code IN ('xam_6', 'xy_28', 'df_ssc')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- Extended catalog: 特码 1–49, PK10 ranks, K3 sums, SSC balls, etc.
-- Run in Supabase SQL Editor after this file:
--   supabase/play_items_full.sql

-- Game rules (สำหรับหน้า /rule — อนาคต)
INSERT INTO game_rules (games_id, title, content, locale)
SELECT g.id, g.name, 'กติกา ' || g.name || ' — ดูรายละเอียดในแอป', 'th'
FROM games g
WHERE NOT EXISTS (SELECT 1 FROM game_rules gr WHERE gr.games_id = g.id AND gr.locale = 'th');

-- Current open issues (1 งวดต่อเกม)
INSERT INTO game_issues (games_id, issue, draw_time, status, bet_quick_amount)
SELECT
  g.id,
  to_char(NOW(), 'YYYYMMDD') || lpad(g.id::text, 3, '0'),
  EXTRACT(EPOCH FROM NOW())::BIGINT + 300,
  0,
  '["10","50","100","500","1000","5000"]'::JSONB
FROM games g
WHERE NOT EXISTS (
  SELECT 1 FROM game_issues gi
  WHERE gi.games_id = g.id AND gi.status = 0
);

-- Draw history (ตัวอย่าง 3 งวดต่อเกม hot)
INSERT INTO draw_results (games_id, issue, result, analyz_result, createtime)
SELECT g.id, v.issue, v.result, v.analy::JSONB, v.ct
FROM games g
CROSS JOIN LATERAL (VALUES
  (to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '001', '1,2,3,4,5,6,7,8,9,10', '{"ds":"big","dx":"odd"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 86400),
  (to_char(NOW() - INTERVAL '2 day', 'YYYYMMDD') || '001', '2,4,6,8,10,1,3,5,7,9', '{"ds":"small","dx":"even"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 172800),
  (to_char(NOW() - INTERVAL '3 day', 'YYYYMMDD') || '001', '5,3,8,1,9,2,7,4,6,10', '{"ds":"big","dx":"odd"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 259200)
) AS v(issue, result, analy, ct)
WHERE g.is_hot = TRUE
  AND NOT EXISTS (SELECT 1 FROM draw_results dr WHERE dr.games_id = g.id AND dr.issue = v.issue);

-- Winning feed (หน้า Home)
INSERT INTO winning_feed (games_id, games_name, username, win_amount, createtime)
SELECT g.id, g.name, v.uname, v.amt, EXTRACT(EPOCH FROM NOW())::BIGINT - v.ago
FROM games g
CROSS JOIN (VALUES
  ('user***88', 15800.00, 600),
  ('lucky***', 9200.00, 1200),
  ('win***01', 45000.00, 3600)
) AS v(uname, amt, ago)
WHERE g.code = 'df_pk10'
  AND NOT EXISTS (SELECT 1 FROM winning_feed LIMIT 1);

-- ---------------------------------------------------------------------------
-- Seed: recharge channels
-- ---------------------------------------------------------------------------
INSERT INTO recharge_channels (type, name, bank_name, bank_username, bank_card, address, notice, quick_amounts, sort)
SELECT v.type, v.name, v.bank_name, v.bank_username, v.bank_card, v.address, v.notice, v.quick_amounts, v.sort
FROM (VALUES
  (
    'bank'::recharge_channel_type,
    'ฝากมาตรฐาน',
    'ธนาคารกสิกรไทย',
    'TH6688 VIP',
    '123-4-56789-0',
    NULL::VARCHAR,
    'กรุณาโอนตามจำนวนที่ระบุ และกรอกชื่อผู้โอนให้ถูกต้อง',
    '["100","500","1000","5000","10000","50000"]'::JSONB,
    1
  ),
  (
    'crypto'::recharge_channel_type,
    'ฝากคริปโต',
    NULL::VARCHAR,
    NULL::VARCHAR,
    NULL::VARCHAR,
    'TXyz1234567890abcdefghijklmnopqrst',
    'โอน USDT (TRC20) ไปยังที่อยู่ด้านล่าง',
    '["100","500","1000","5000","10000","20000"]'::JSONB,
    2
  )
) AS v(type, name, bank_name, bank_username, bank_card, address, notice, quick_amounts, sort)
WHERE NOT EXISTS (SELECT 1 FROM recharge_channels WHERE name = v.name LIMIT 1);

-- ---------------------------------------------------------------------------
-- Seed: promotions & messages
-- ---------------------------------------------------------------------------
INSERT INTO activities (category_id, title, text, images, sort)
SELECT v.category_id, v.title, v.text, v.images, v.sort
FROM (VALUES
  (68, 'โบนัสสมาชิกใหม่ 100%', 'ฝากครั้งแรกรับโบนัส 100% สูงสุด 5,000 บาท', '/assets/banners/5e7d4bbe39c155668986f351cc5dcd8a.jpg', 1),
  (68, 'คืนยอดเสียรายวัน', 'รับคืนยอดเสีย 5% ทุกวัน ไม่มีเงื่อนไข ถอนได้ทันที', '/assets/hotLottery-x5UubMuW.png', 2),
  (69, 'แนะนำเพื่อนรับโบนัส', 'ชวนเพื่อนสมัครรับ 200 บาทต่อคน ไม่จำกัดจำนวน', '/assets/lobby-CZimZjU1.png', 3),
  (69, 'กิจกรรมพิเศษประจำสัปดาห์', 'ร่วมกิจกรรมลุ้นรางวัลใหญ่ทุกสัปดาห์', '/assets/banners/5e7d4bbe39c155668986f351cc5dcd8a.jpg', 4)
) AS v(category_id, title, text, images, sort)
WHERE NOT EXISTS (SELECT 1 FROM activities a WHERE a.title = v.title LIMIT 1);

INSERT INTO user_notices (scope, title, content, createtime)
SELECT v.scope, v.title, v.content, v.createtime
FROM (VALUES
  ('broadcast'::notice_scope, 'ยินดีต้อนรับสมาชิกใหม่', '<p>ยินดีต้อนรับสู่แพลตฟอร์มหวยออนไลน์ ฝากครั้งแรกรับโบนัสพิเศษ 100%</p>', EXTRACT(EPOCH FROM NOW())::BIGINT - 86400),
  ('broadcast'::notice_scope, 'แจ้งปรับปรุงระบบ', '<p>ระบบจะทำการปรับปรุงเซิร์ฟเวอร์ในวันที่ 30 มิ.ย. เวลา 02:00–04:00 น.</p>', EXTRACT(EPOCH FROM NOW())::BIGINT - 172800),
  ('broadcast'::notice_scope, 'โปรโมชั่น VIP', '<p>สมาชิก VIP ที่มียอดฝากสะสมถึงเกณฑ์ ติดต่อฝ่ายบริการลูกค้าเพื่อรับโบนัสพิเศษ</p>', EXTRACT(EPOCH FROM NOW())::BIGINT - 259200)
) AS v(scope, title, content, createtime)
WHERE NOT EXISTS (SELECT 1 FROM user_notices n WHERE n.title = v.title LIMIT 1);

INSERT INTO site_banners (image, sort)
SELECT '/assets/banners/5e7d4bbe39c155668986f351cc5dcd8a.jpg', 1
WHERE NOT EXISTS (SELECT 1 FROM site_banners LIMIT 1);

-- ---------------------------------------------------------------------------
-- Seed: demo user (ข้อมูลตัวอย่าง — ใช้ Supabase Auth สมัครจริงในแอป)
-- หมายเหตุ: user id=1 ไม่มี auth_user_id จึง login ผ่านแอปไม่ได้
--           bet_records / wallet ด้านล่างเป็นตัวอย่าง UI เท่านั้น
-- ---------------------------------------------------------------------------
INSERT INTO users (id, username, password_hash, nickname, avatar, money, is_paypwd, createtime)
VALUES (
  1, 'demo', crypt('123456', gen_salt('bf')), 'demo', '/assets/logo.jpg',
  10000.00, FALSE, EXTRACT(EPOCH FROM NOW())::BIGINT
)
ON CONFLICT (username) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  avatar = EXCLUDED.avatar,
  money = EXCLUDED.money;

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users));

INSERT INTO user_bank_cards (user_id, bank_name, bank_username, bank_card, is_default) VALUES
  (1, 'ธนาคารกสิกรไทย', 'demo user', '123-4-56789-0', TRUE)
ON CONFLICT (user_id, bank_card) DO NOTHING;

INSERT INTO user_crypto_wallets (user_id, address, remark, is_default) VALUES
  (1, 'TXyz1234567890abcdefghijklmnopqrst', 'USDT TRC20', TRUE)
ON CONFLICT (user_id, address) DO NOTHING;

INSERT INTO user_money_logs (user_id, category_id, money, before_money, after_money, type, createtime)
SELECT 1, 14, 5000, 5000, 10000, 'ฝากเงิน', EXTRACT(EPOCH FROM NOW())::BIGINT - 86400
WHERE NOT EXISTS (SELECT 1 FROM user_money_logs WHERE user_id = 1 AND category_id = 14 AND type = 'ฝากเงิน');

INSERT INTO user_money_logs (user_id, category_id, money, before_money, after_money, type, createtime)
SELECT 1, 15, -1000, 10000, 9000, 'ถอนเงิน', EXTRACT(EPOCH FROM NOW())::BIGINT - 172800
WHERE NOT EXISTS (SELECT 1 FROM user_money_logs WHERE user_id = 1 AND category_id = 15);

INSERT INTO user_money_logs (user_id, category_id, money, before_money, after_money, type, createtime)
SELECT 1, 20, -200, 9000, 8800, 'เดิมพัน', EXTRACT(EPOCH FROM NOW())::BIGINT - 3600
WHERE NOT EXISTS (SELECT 1 FROM user_money_logs WHERE user_id = 1 AND category_id = 20);

INSERT INTO user_money_logs (user_id, category_id, money, before_money, after_money, type, createtime)
SELECT 1, 19, 850, 8800, 9650, 'ชนะเดิมพัน', EXTRACT(EPOCH FROM NOW())::BIGINT - 7200
WHERE NOT EXISTS (SELECT 1 FROM user_money_logs WHERE user_id = 1 AND category_id = 19);

INSERT INTO bet_records (
  user_id, games_id, games_name, issue, category_name, bet_content,
  amount, win_amount, status, status_text, is_win, is_win_text, createtime
)
SELECT 1, 1, 'PK10 10 นาที', '20250629001', '冠亚军和-大小单双', 'ใหญ่', 100, 196, '1', 'ชำระแล้ว', '1', 'ชนะ', EXTRACT(EPOCH FROM NOW())::BIGINT - 3600
WHERE NOT EXISTS (SELECT 1 FROM bet_records WHERE user_id = 1 AND issue = '20250629001');

INSERT INTO bet_records (
  user_id, games_id, games_name, issue, category_name, bet_content,
  amount, win_amount, status, status_text, is_win, is_win_text, createtime
)
SELECT 1, 2, 'K3', '20250629002', '和值', 'เล็ก', 50, 0, '1', 'ชำระแล้ว', '0', 'แพ้', EXTRACT(EPOCH FROM NOW())::BIGINT - 86400
WHERE NOT EXISTS (SELECT 1 FROM bet_records WHERE user_id = 1 AND issue = '20250629002');

INSERT INTO bet_records (
  user_id, games_id, games_name, issue, category_name, bet_content,
  amount, win_amount, status, status_text, is_win, is_win_text, createtime
)
SELECT 1, 4, 'Lucky 28', '20250628001', '两面盘', 'คู่', 200, 0, '0', 'รอดำเนินการ', '0', 'รอผล', EXTRACT(EPOCH FROM NOW())::BIGINT - 172800
WHERE NOT EXISTS (SELECT 1 FROM bet_records WHERE user_id = 1 AND issue = '20250628001');

-- ---------------------------------------------------------------------------
-- Supabase Auth sync + RPC (รวมจาก supabase/auth_setup.sql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (
    auth_user_id, username, password_hash, nickname, avatar, createtime
  ) VALUES (
    NEW.id, v_username, '',
    COALESCE(NEW.raw_user_meta_data->>'nickname', v_username),
    '/assets/logo.jpg',
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.set_pay_password(p_password TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'password too short'; END IF;
  UPDATE users SET pay_password_hash = crypt(p_password, gen_salt('bf')),
    updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_pay_password(p_password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hash TEXT;
BEGIN
  SELECT pay_password_hash INTO v_hash FROM users WHERE auth_user_id = auth.uid();
  IF v_hash IS NULL OR v_hash = '' THEN RETURN FALSE; END IF;
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_deposit(p_amount NUMERIC, p_channel_type TEXT DEFAULT 'bank')
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id BIGINT; v_order_id BIGINT; v_label TEXT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  v_label := CASE WHEN p_channel_type = 'crypto' THEN 'ฝากคริปโต' ELSE 'ฝากเงิน' END;
  INSERT INTO deposit_orders (user_id, channel_type, amount, status, createtime, audittime)
  VALUES (v_user_id, p_channel_type::recharge_channel_type, p_amount, 'approved',
    EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT)
  RETURNING id INTO v_order_id;
  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (v_user_id, 14, p_amount, v_label, 'deposit', v_order_id, EXTRACT(EPOCH FROM NOW())::BIGINT);
  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_withdraw(
  p_amount NUMERIC, p_pay_password TEXT, p_type TEXT DEFAULT 'bank',
  p_bank_name TEXT DEFAULT NULL, p_bank_card TEXT DEFAULT NULL, p_bank_username TEXT DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id BIGINT; v_cfg RECORD; v_order_id BIGINT; v_fee NUMERIC(18,2); v_wtype withdraw_type;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF NOT verify_pay_password(p_pay_password) THEN RAISE EXCEPTION 'invalid pay password'; END IF;
  SELECT * INTO v_cfg FROM withdraw_settings WHERE id = 1;
  IF p_amount < v_cfg.withdraw_min OR p_amount > v_cfg.withdraw_max THEN
    RAISE EXCEPTION 'amount out of range';
  END IF;
  v_fee := v_cfg.withdraw_fee;
  v_wtype := CASE WHEN p_type = 'crypto' THEN 'crypto'::withdraw_type ELSE 'bank'::withdraw_type END;
  INSERT INTO withdraw_orders (user_id, type, bank_name, bank_card, bank_username, amount, fee, status, createtime, audittime)
  VALUES (v_user_id, v_wtype, p_bank_name, p_bank_card, p_bank_username, p_amount, v_fee, 'approved',
    EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT)
  RETURNING id INTO v_order_id;
  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (v_user_id, 15, -(p_amount + v_fee), 'ถอนเงิน', 'withdraw', v_order_id, EXTRACT(EPOCH FROM NOW())::BIGINT);
  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notice_read(p_notice_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO user_notice_reads (user_id, notice_id) VALUES (v_user_id, p_notice_id)
  ON CONFLICT (user_id, notice_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deposit(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_withdraw(NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notice_read(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_user_profits(BIGINT, BIGINT, BIGINT) TO authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION — รันหลัง COMMIT เพื่อตรวจว่าข้อมูลครบ
-- =============================================================================
SELECT 'site_settings' AS tbl, COUNT(*)::TEXT AS rows FROM site_settings
UNION ALL SELECT 'site_banners', COUNT(*)::TEXT FROM site_banners
UNION ALL SELECT 'winning_feed', COUNT(*)::TEXT FROM winning_feed
UNION ALL SELECT 'activities', COUNT(*)::TEXT FROM activities
UNION ALL SELECT 'vip_tiers', COUNT(*)::TEXT FROM vip_tiers
UNION ALL SELECT 'game_categories', COUNT(*)::TEXT FROM game_categories
UNION ALL SELECT 'games', COUNT(*)::TEXT FROM games
UNION ALL SELECT 'play_groups', COUNT(*)::TEXT FROM play_groups
UNION ALL SELECT 'play_items', COUNT(*)::TEXT FROM play_items
UNION ALL SELECT 'game_rules', COUNT(*)::TEXT FROM game_rules
UNION ALL SELECT 'game_issues', COUNT(*)::TEXT FROM game_issues
UNION ALL SELECT 'draw_results', COUNT(*)::TEXT FROM draw_results
UNION ALL SELECT 'money_categories', COUNT(*)::TEXT FROM money_categories
UNION ALL SELECT 'withdraw_settings', COUNT(*)::TEXT FROM withdraw_settings
UNION ALL SELECT 'recharge_channels', COUNT(*)::TEXT FROM recharge_channels
UNION ALL SELECT 'user_notices', COUNT(*)::TEXT FROM user_notices
UNION ALL SELECT 'users (demo)', COUNT(*)::TEXT FROM users WHERE username = 'demo'
ORDER BY tbl;

-- คาดหวังขั้นต่ำ: games=7, vip_tiers=6, activities=4, user_notices=3,
-- recharge_channels=2, money_categories=4, play_items>=20, game_issues=7
