-- Internal customer-service chat (no external iframe)
-- Run after admin_setup.sql

BEGIN;

CREATE TABLE IF NOT EXISTS service_conversations (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT REFERENCES users(id) ON DELETE SET NULL,
  guest_key         VARCHAR(64),
  status            SMALLINT NOT NULL DEFAULT 0,
  last_message_at   BIGINT NOT NULL DEFAULT 0,
  last_preview      TEXT,
  unread_staff      INT NOT NULL DEFAULT 0,
  unread_member     INT NOT NULL DEFAULT 0,
  createtime        BIGINT NOT NULL,
  updatetime        BIGINT NOT NULL,
  CONSTRAINT service_conv_actor CHECK (user_id IS NOT NULL OR guest_key IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_conv_user
  ON service_conversations (user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_conv_guest
  ON service_conversations (guest_key) WHERE user_id IS NULL AND guest_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_conv_last ON service_conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS service_messages (
  id                BIGSERIAL PRIMARY KEY,
  conversation_id   BIGINT NOT NULL REFERENCES service_conversations(id) ON DELETE CASCADE,
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('member', 'staff', 'system')),
  sender_user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  content           TEXT NOT NULL,
  createtime        BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_msg_conv_id
  ON service_messages (conversation_id, id);

ALTER TABLE service_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_direct_service_conversations" ON service_conversations;
CREATE POLICY "deny_direct_service_conversations" ON service_conversations FOR ALL USING (false);

DROP POLICY IF EXISTS "deny_direct_service_messages" ON service_messages;
CREATE POLICY "deny_direct_service_messages" ON service_messages FOR ALL USING (false);

CREATE OR REPLACE FUNCTION public.fn_service_welcome_message()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'สวัสดีค่ะ ยินดีให้บริการ 24 ชั่วโมง มีอะไรให้ช่วยเหลือไหมคะ?'::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.fn_service_get_or_create_conv(
  p_user_id BIGINT,
  p_guest_key TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_now BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_id FROM service_conversations WHERE user_id = p_user_id LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;

    INSERT INTO service_conversations (
      user_id, guest_key, status, last_message_at, unread_staff, unread_member, createtime, updatetime
    ) VALUES (
      p_user_id, NULL, 0, v_now, 0, 0, v_now, v_now
    )
    RETURNING id INTO v_id;

    INSERT INTO service_messages (conversation_id, sender_type, content, createtime)
    VALUES (v_id, 'system', fn_service_welcome_message(), v_now);

    UPDATE service_conversations
    SET last_preview = fn_service_welcome_message(), last_message_at = v_now
    WHERE id = v_id;

    RETURN v_id;
  END IF;

  IF COALESCE(TRIM(p_guest_key), '') = '' THEN
    RAISE EXCEPTION 'guest key required';
  END IF;

  SELECT id INTO v_id
  FROM service_conversations
  WHERE user_id IS NULL AND guest_key = TRIM(p_guest_key)
  LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO service_conversations (
    user_id, guest_key, status, last_message_at, unread_staff, unread_member, createtime, updatetime
  ) VALUES (
    NULL, TRIM(p_guest_key), 0, v_now, 0, 0, v_now, v_now
  )
  RETURNING id INTO v_id;

  INSERT INTO service_messages (conversation_id, sender_type, content, createtime)
  VALUES (v_id, 'system', fn_service_welcome_message(), v_now);

  UPDATE service_conversations
  SET last_preview = fn_service_welcome_message(), last_message_at = v_now
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_service_assert_member_conv(
  p_conversation_id BIGINT,
  p_user_id BIGINT,
  p_guest_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row service_conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM service_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'conversation not found'; END IF;

  IF p_user_id IS NOT NULL THEN
    IF v_row.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'access denied';
    END IF;
    RETURN;
  END IF;

  IF v_row.user_id IS NOT NULL OR v_row.guest_key IS DISTINCT FROM TRIM(p_guest_key) THEN
    RAISE EXCEPTION 'access denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_open_chat(p_guest_key TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_conv_id BIGINT;
  v_msgs JSONB;
BEGIN
  v_user_id := fn_current_db_user_id();

  v_conv_id := fn_service_get_or_create_conv(v_user_id, p_guest_key);

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.id), '[]'::JSONB)
  INTO v_msgs
  FROM (
    SELECT
      m.id,
      m.sender_type,
      m.content,
      m.createtime,
      CASE
        WHEN m.sender_type = 'staff' THEN COALESCE(u.nickname, u.username, 'เจ้าหน้าที่')
        WHEN m.sender_type = 'member' THEN COALESCE(mu.nickname, mu.username, 'สมาชิก')
        ELSE 'ระบบ'
      END AS sender_name
    FROM service_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    LEFT JOIN service_conversations c ON c.id = m.conversation_id
    LEFT JOIN users mu ON mu.id = c.user_id
    WHERE m.conversation_id = v_conv_id
    ORDER BY m.id
    LIMIT 200
  ) t;

  UPDATE service_conversations
  SET unread_member = 0, updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_conv_id;

  RETURN jsonb_build_object(
    'conversation_id', v_conv_id,
    'messages', v_msgs
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_send_chat_message(
  p_content TEXT,
  p_guest_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_conv_id BIGINT;
  v_now BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_body TEXT := TRIM(p_content);
  v_msg_id BIGINT;
BEGIN
  IF v_body = '' OR char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'invalid message';
  END IF;

  v_user_id := fn_current_db_user_id();
  v_conv_id := fn_service_get_or_create_conv(v_user_id, p_guest_key);

  INSERT INTO service_messages (conversation_id, sender_type, sender_user_id, content, createtime)
  VALUES (v_conv_id, 'member', v_user_id, v_body, v_now)
  RETURNING id INTO v_msg_id;

  UPDATE service_conversations
  SET
    last_message_at = v_now,
    last_preview = left(v_body, 120),
    unread_staff = unread_staff + 1,
    updatetime = v_now,
    status = 0
  WHERE id = v_conv_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'conversation_id', v_conv_id,
    'sender_type', 'member',
    'content', v_body,
    'createtime', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_poll_chat_messages(
  p_conversation_id BIGINT,
  p_guest_key TEXT DEFAULT NULL,
  p_after_id BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_msgs JSONB;
BEGIN
  v_user_id := fn_current_db_user_id();
  PERFORM fn_service_assert_member_conv(p_conversation_id, v_user_id, p_guest_key);

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.id), '[]'::JSONB)
  INTO v_msgs
  FROM (
    SELECT
      m.id,
      m.sender_type,
      m.content,
      m.createtime,
      CASE
        WHEN m.sender_type = 'staff' THEN COALESCE(u.nickname, u.username, 'เจ้าหน้าที่')
        WHEN m.sender_type = 'member' THEN COALESCE(mu.nickname, mu.username, 'สมาชิก')
        ELSE 'ระบบ'
      END AS sender_name
    FROM service_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    LEFT JOIN service_conversations c ON c.id = m.conversation_id
    LEFT JOIN users mu ON mu.id = c.user_id
    WHERE m.conversation_id = p_conversation_id AND m.id > COALESCE(p_after_id, 0)
    ORDER BY m.id
    LIMIT 100
  ) t;

  UPDATE service_conversations
  SET unread_member = 0, updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('messages', v_msgs);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_service_chats(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
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
      SELECT jsonb_agg(row_to_json(t) ORDER BY sort_at DESC, id DESC)
      FROM (
        SELECT
          c.id,
          c.user_id,
          c.guest_key,
          c.status,
          c.last_message_at,
          c.last_preview,
          c.unread_staff,
          c.unread_member,
          COALESCE(u.username, CASE WHEN c.guest_key IS NOT NULL THEN 'ผู้เยี่ยมชม' END) AS username,
          COALESCE(u.nickname, u.username, 'ผู้เยี่ยมชม') AS display_name,
          c.last_message_at AS sort_at
        FROM service_conversations c
        LEFT JOIN users u ON u.id = c.user_id
        ORDER BY c.last_message_at DESC, c.id DESC
        LIMIT GREATEST(1, LEAST(p_limit, 100))
        OFFSET GREATEST(0, p_offset)
      ) t
    ),
    '[]'::JSONB
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_service_chat_thread(p_conversation_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv JSONB;
  v_msgs JSONB;
BEGIN
  PERFORM fn_assert_staff();

  SELECT row_to_json(t)::JSONB INTO v_conv
  FROM (
    SELECT
      c.id,
      c.user_id,
      c.guest_key,
      c.status,
      c.last_message_at,
      c.unread_staff,
      COALESCE(u.username, 'guest') AS username,
      COALESCE(u.nickname, u.username, 'ผู้เยี่ยมชม') AS display_name
    FROM service_conversations c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = p_conversation_id
  ) t;

  IF v_conv IS NULL THEN RAISE EXCEPTION 'conversation not found'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(m) ORDER BY m.id), '[]'::JSONB) INTO v_msgs
  FROM (
    SELECT
      sm.id,
      sm.sender_type,
      sm.content,
      sm.createtime,
      CASE
        WHEN sm.sender_type = 'staff' THEN COALESCE(u.nickname, u.username, 'เจ้าหน้าที่')
        WHEN sm.sender_type = 'member' THEN COALESCE(mu.nickname, mu.username, 'สมาชิก')
        ELSE 'ระบบ'
      END AS sender_name
    FROM service_messages sm
    LEFT JOIN users u ON u.id = sm.sender_user_id
    LEFT JOIN service_conversations c ON c.id = sm.conversation_id
    LEFT JOIN users mu ON mu.id = c.user_id
    WHERE sm.conversation_id = p_conversation_id
    ORDER BY sm.id
    LIMIT 300
  ) m;

  UPDATE service_conversations
  SET unread_staff = 0, updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('conversation', v_conv, 'messages', v_msgs);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reply_service_chat(
  p_conversation_id BIGINT,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id BIGINT;
  v_now BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_body TEXT := TRIM(p_content);
  v_msg_id BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  IF v_body = '' OR char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'invalid message';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_conversations WHERE id = p_conversation_id) THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  v_staff_id := fn_current_db_user_id();

  INSERT INTO service_messages (conversation_id, sender_type, sender_user_id, content, createtime)
  VALUES (p_conversation_id, 'staff', v_staff_id, v_body, v_now)
  RETURNING id INTO v_msg_id;

  UPDATE service_conversations
  SET
    last_message_at = v_now,
    last_preview = left(v_body, 120),
    unread_member = unread_member + 1,
    unread_staff = 0,
    updatetime = v_now,
    status = 0
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'sender_type', 'staff',
    'content', v_body,
    'createtime', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_service_unread_count()
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();
  RETURN COALESCE((SELECT SUM(unread_staff)::INT FROM service_conversations), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.service_open_chat(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.service_send_chat_message(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.service_poll_chat_messages(BIGINT, TEXT, BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_service_chats(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_service_chat_thread(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reply_service_chat(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_service_unread_count() TO authenticated;

COMMIT;
