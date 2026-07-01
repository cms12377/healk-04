-- Admin CMS: promotions (activities), VIP tiers, bonus messages (user_notices)
-- Run after fix_admin_cms.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Promotions / activities
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_activities(
  p_category_id SMALLINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t) ORDER BY sort_val, id_val)
      FROM (
        SELECT
          a.id,
          a.category_id,
          a.title,
          a.text,
          a.images,
          a.status,
          a.sort,
          a.createtime,
          a.sort AS sort_val,
          a.id AS id_val
        FROM activities a
        WHERE p_category_id IS NULL OR a.category_id = p_category_id
        ORDER BY a.sort, a.id
      ) t
    ),
    '[]'::JSONB
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_activity(
  p_id BIGINT DEFAULT NULL,
  p_category_id SMALLINT DEFAULT 68,
  p_title TEXT DEFAULT '',
  p_text TEXT DEFAULT NULL,
  p_images TEXT DEFAULT NULL,
  p_sort INT DEFAULT 0,
  p_status SMALLINT DEFAULT 1
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'title required';
  END IF;

  IF p_category_id NOT IN (68, 69) THEN
    RAISE EXCEPTION 'invalid category';
  END IF;

  IF p_status NOT IN (0, 1) THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO activities (category_id, title, text, images, sort, status)
    VALUES (
      p_category_id,
      TRIM(p_title),
      NULLIF(TRIM(p_text), ''),
      NULLIF(TRIM(p_images), ''),
      COALESCE(p_sort, 0),
      COALESCE(p_status, 1)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE activities
    SET
      category_id = p_category_id,
      title = TRIM(p_title),
      text = NULLIF(TRIM(p_text), ''),
      images = NULLIF(TRIM(p_images), ''),
      sort = COALESCE(p_sort, 0),
      status = COALESCE(p_status, 1)
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'activity not found';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_activity(p_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  DELETE FROM activities WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- VIP tiers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_vip_tiers()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t) ORDER BY sort_val, level_val)
      FROM (
        SELECT
          v.level,
          v.image,
          v.deposit_required,
          v.sort,
          v.sort AS sort_val,
          v.level AS level_val
        FROM vip_tiers v
        ORDER BY v.sort, v.level
      ) t
    ),
    '[]'::JSONB
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_vip_tier(
  p_level SMALLINT DEFAULT 1,
  p_image TEXT DEFAULT NULL,
  p_deposit_required NUMERIC DEFAULT 0,
  p_sort INT DEFAULT 0
)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level SMALLINT;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_level < 1 OR p_level > 99 THEN
    RAISE EXCEPTION 'invalid level';
  END IF;

  IF COALESCE(p_deposit_required, 0) < 0 THEN
    RAISE EXCEPTION 'deposit required must be >= 0';
  END IF;

  INSERT INTO vip_tiers (level, image, deposit_required, sort)
  VALUES (
    p_level,
    NULLIF(TRIM(p_image), ''),
    COALESCE(p_deposit_required, 0),
    COALESCE(p_sort, 0)
  )
  ON CONFLICT (level) DO UPDATE SET
    image = EXCLUDED.image,
    deposit_required = EXCLUDED.deposit_required,
    sort = EXCLUDED.sort
  RETURNING level INTO v_level;

  RETURN v_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_vip_tier(p_level SMALLINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  DELETE FROM vip_tiers WHERE level = p_level;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'vip tier not found';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Bonus messages (user_notices)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_user_notices()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t) ORDER BY time_val DESC, id_val DESC)
      FROM (
        SELECT
          n.id,
          n.scope,
          n.user_id,
          u.username,
          n.title,
          n.content,
          n.createtime,
          n.createtime AS time_val,
          n.id AS id_val
        FROM user_notices n
        LEFT JOIN users u ON u.id = n.user_id
        ORDER BY n.createtime DESC, n.id DESC
      ) t
    ),
    '[]'::JSONB
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_user_notice(
  p_id BIGINT DEFAULT NULL,
  p_scope TEXT DEFAULT 'broadcast',
  p_user_id BIGINT DEFAULT NULL,
  p_title TEXT DEFAULT '',
  p_content TEXT DEFAULT ''
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_scope notice_scope;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'title required';
  END IF;

  IF TRIM(p_content) = '' THEN
    RAISE EXCEPTION 'content required';
  END IF;

  v_scope := CASE
    WHEN p_scope = 'user' THEN 'user'::notice_scope
    ELSE 'broadcast'::notice_scope
  END;

  IF v_scope = 'user'::notice_scope THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'user_id required for personal notice';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'user not found';
    END IF;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO user_notices (scope, user_id, title, content)
    VALUES (
      v_scope,
      CASE WHEN v_scope = 'user'::notice_scope THEN p_user_id ELSE NULL END,
      TRIM(p_title),
      TRIM(p_content)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE user_notices
    SET
      scope = v_scope,
      user_id = CASE WHEN v_scope = 'user'::notice_scope THEN p_user_id ELSE NULL END,
      title = TRIM(p_title),
      content = TRIM(p_content)
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'notice not found';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_notice(p_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  DELETE FROM user_notices WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'notice not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_activities(SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_activity(BIGINT, SMALLINT, TEXT, TEXT, TEXT, INT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_activity(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_vip_tiers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_vip_tier(SMALLINT, TEXT, NUMERIC, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_vip_tier(SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_user_notices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_user_notice(BIGINT, TEXT, BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_notice(BIGINT) TO authenticated;

COMMIT;
