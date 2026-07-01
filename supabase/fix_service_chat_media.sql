-- Service chat: images/files + message recall (soft delete)
-- Run after fix_internal_service_chat.sql

BEGIN;

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::TEXT[]
WHERE id = 'site-assets';

ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS msg_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS attachment_mime TEXT;
ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS deleted_at BIGINT;
ALTER TABLE service_messages ADD COLUMN IF NOT EXISTS updatetime BIGINT;

UPDATE service_messages SET updatetime = createtime WHERE updatetime IS NULL;
ALTER TABLE service_messages ALTER COLUMN updatetime SET NOT NULL;
ALTER TABLE service_messages ALTER COLUMN updatetime SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_messages_msg_type_check'
  ) THEN
    ALTER TABLE service_messages
      ADD CONSTRAINT service_messages_msg_type_check
      CHECK (msg_type IN ('text', 'image', 'file'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_service_msg_preview(
  p_msg_type TEXT,
  p_content TEXT,
  p_attachment_name TEXT,
  p_is_deleted BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF COALESCE(p_is_deleted, false) THEN
    RETURN 'ข้อความถูกยกเลิก';
  END IF;
  IF p_msg_type = 'image' THEN
    RETURN COALESCE(NULLIF(TRIM(p_content), ''), '[รูปภาพ]');
  END IF;
  IF p_msg_type = 'file' THEN
    RETURN COALESCE(NULLIF(TRIM(p_content), ''), COALESCE(NULLIF(TRIM(p_attachment_name), ''), '[ไฟล์]'));
  END IF;
  RETURN COALESCE(NULLIF(TRIM(p_content), ''), '—');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_service_validate_attachment_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_url TEXT := TRIM(COALESCE(p_url, ''));
BEGIN
  IF v_url = '' THEN RETURN false; END IF;
  IF char_length(v_url) > 2048 THEN RETURN false; END IF;
  IF v_url NOT LIKE '%/storage/v1/object/public/site-assets/service-chat/%'
     AND v_url NOT LIKE '%/storage/v1/object/sign/site-assets/service-chat/%' THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_service_refresh_conv_preview(p_conv_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview TEXT;
  v_at BIGINT;
BEGIN
  SELECT
    fn_service_msg_preview(m.msg_type, m.content, m.attachment_name, m.is_deleted),
    m.createtime
  INTO v_preview, v_at
  FROM service_messages m
  WHERE m.conversation_id = p_conv_id AND NOT m.is_deleted
  ORDER BY m.id DESC
  LIMIT 1;

  UPDATE service_conversations
  SET
    last_preview = COALESCE(v_preview, '—'),
    last_message_at = COALESCE(v_at, last_message_at),
    updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_send_chat_message(
  p_content TEXT,
  p_guest_key TEXT DEFAULT NULL,
  p_msg_type TEXT DEFAULT 'text',
  p_attachment_url TEXT DEFAULT NULL,
  p_attachment_name TEXT DEFAULT NULL,
  p_attachment_mime TEXT DEFAULT NULL
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
  v_body TEXT := TRIM(COALESCE(p_content, ''));
  v_type TEXT := COALESCE(NULLIF(TRIM(p_msg_type), ''), 'text');
  v_url TEXT := NULLIF(TRIM(COALESCE(p_attachment_url, '')), '');
  v_name TEXT := NULLIF(TRIM(COALESCE(p_attachment_name, '')), '');
  v_mime TEXT := NULLIF(TRIM(COALESCE(p_attachment_mime, '')), '');
  v_msg_id BIGINT;
  v_preview TEXT;
BEGIN
  IF v_type NOT IN ('text', 'image', 'file') THEN
    RAISE EXCEPTION 'invalid message type';
  END IF;
  IF v_type = 'text' AND v_body = '' THEN
    RAISE EXCEPTION 'invalid message';
  END IF;
  IF v_type IN ('image', 'file') AND NOT fn_service_validate_attachment_url(v_url) THEN
    RAISE EXCEPTION 'invalid attachment';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'invalid message';
  END IF;

  v_user_id := fn_current_db_user_id();
  v_conv_id := fn_service_get_or_create_conv(v_user_id, p_guest_key);
  v_preview := fn_service_msg_preview(v_type, v_body, v_name, false);

  INSERT INTO service_messages (
    conversation_id, sender_type, sender_user_id, content, msg_type,
    attachment_url, attachment_name, attachment_mime, createtime, updatetime
  ) VALUES (
    v_conv_id, 'member', v_user_id, v_body, v_type,
    v_url, v_name, v_mime, v_now, v_now
  )
  RETURNING id INTO v_msg_id;

  UPDATE service_conversations
  SET
    last_message_at = v_now,
    last_preview = left(v_preview, 120),
    unread_staff = unread_staff + 1,
    updatetime = v_now,
    status = 0
  WHERE id = v_conv_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'conversation_id', v_conv_id,
    'sender_type', 'member',
    'msg_type', v_type,
    'content', v_body,
    'attachment_url', v_url,
    'attachment_name', v_name,
    'attachment_mime', v_mime,
    'is_deleted', false,
    'createtime', v_now,
    'updatetime', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reply_service_chat(
  p_conversation_id BIGINT,
  p_content TEXT,
  p_msg_type TEXT DEFAULT 'text',
  p_attachment_url TEXT DEFAULT NULL,
  p_attachment_name TEXT DEFAULT NULL,
  p_attachment_mime TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id BIGINT;
  v_now BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_body TEXT := TRIM(COALESCE(p_content, ''));
  v_type TEXT := COALESCE(NULLIF(TRIM(p_msg_type), ''), 'text');
  v_url TEXT := NULLIF(TRIM(COALESCE(p_attachment_url, '')), '');
  v_name TEXT := NULLIF(TRIM(COALESCE(p_attachment_name, '')), '');
  v_mime TEXT := NULLIF(TRIM(COALESCE(p_attachment_mime, '')), '');
  v_msg_id BIGINT;
  v_preview TEXT;
BEGIN
  PERFORM fn_assert_staff();
  IF v_type NOT IN ('text', 'image', 'file') THEN
    RAISE EXCEPTION 'invalid message type';
  END IF;
  IF v_type = 'text' AND v_body = '' THEN
    RAISE EXCEPTION 'invalid message';
  END IF;
  IF v_type IN ('image', 'file') AND NOT fn_service_validate_attachment_url(v_url) THEN
    RAISE EXCEPTION 'invalid attachment';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'invalid message';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM service_conversations WHERE id = p_conversation_id) THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  v_staff_id := fn_current_db_user_id();
  v_preview := fn_service_msg_preview(v_type, v_body, v_name, false);

  INSERT INTO service_messages (
    conversation_id, sender_type, sender_user_id, content, msg_type,
    attachment_url, attachment_name, attachment_mime, createtime, updatetime
  ) VALUES (
    p_conversation_id, 'staff', v_staff_id, v_body, v_type,
    v_url, v_name, v_mime, v_now, v_now
  )
  RETURNING id INTO v_msg_id;

  UPDATE service_conversations
  SET
    last_message_at = v_now,
    last_preview = left(v_preview, 120),
    unread_member = unread_member + 1,
    unread_staff = 0,
    updatetime = v_now,
    status = 0
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'sender_type', 'staff',
    'msg_type', v_type,
    'content', v_body,
    'attachment_url', v_url,
    'attachment_name', v_name,
    'attachment_mime', v_mime,
    'is_deleted', false,
    'createtime', v_now,
    'updatetime', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_recall_chat_message(
  p_message_id BIGINT,
  p_guest_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_row service_messages%ROWTYPE;
  v_now BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT;
BEGIN
  v_user_id := fn_current_db_user_id();

  SELECT * INTO v_row FROM service_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found'; END IF;
  IF v_row.is_deleted THEN RAISE EXCEPTION 'message already deleted'; END IF;
  IF v_row.sender_type <> 'member' THEN RAISE EXCEPTION 'cannot delete message'; END IF;

  PERFORM fn_service_assert_member_conv(v_row.conversation_id, v_user_id, p_guest_key);

  IF v_user_id IS NOT NULL AND v_row.sender_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'cannot delete message';
  END IF;

  UPDATE service_messages
  SET is_deleted = true, deleted_at = v_now, updatetime = v_now, content = ''
  WHERE id = p_message_id;

  PERFORM fn_service_refresh_conv_preview(v_row.conversation_id);

  RETURN jsonb_build_object('id', p_message_id, 'is_deleted', true, 'updatetime', v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recall_service_chat_message(p_message_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id BIGINT;
  v_row service_messages%ROWTYPE;
  v_now BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  v_staff_id := fn_current_db_user_id();

  SELECT * INTO v_row FROM service_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found'; END IF;
  IF v_row.is_deleted THEN RAISE EXCEPTION 'message already deleted'; END IF;
  IF v_row.sender_type <> 'staff' THEN RAISE EXCEPTION 'cannot delete message'; END IF;
  IF v_row.sender_user_id IS DISTINCT FROM v_staff_id THEN
    RAISE EXCEPTION 'cannot delete message';
  END IF;

  UPDATE service_messages
  SET is_deleted = true, deleted_at = v_now, updatetime = v_now, content = ''
  WHERE id = p_message_id;

  PERFORM fn_service_refresh_conv_preview(v_row.conversation_id);

  RETURN jsonb_build_object('id', p_message_id, 'is_deleted', true, 'updatetime', v_now);
END;
$$;

-- Replace message projections in open/poll/admin list functions
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
      m.msg_type,
      m.content,
      m.attachment_url,
      m.attachment_name,
      m.attachment_mime,
      m.is_deleted,
      m.createtime,
      m.updatetime,
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

  RETURN jsonb_build_object('conversation_id', v_conv_id, 'messages', v_msgs);
END;
$$;

CREATE OR REPLACE FUNCTION public.service_poll_chat_messages(
  p_conversation_id BIGINT,
  p_guest_key TEXT DEFAULT NULL,
  p_after_id BIGINT DEFAULT 0,
  p_updates_since BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_msgs JSONB;
  v_updates JSONB;
BEGIN
  v_user_id := fn_current_db_user_id();
  PERFORM fn_service_assert_member_conv(p_conversation_id, v_user_id, p_guest_key);

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.id), '[]'::JSONB)
  INTO v_msgs
  FROM (
    SELECT
      m.id,
      m.sender_type,
      m.msg_type,
      m.content,
      m.attachment_url,
      m.attachment_name,
      m.attachment_mime,
      m.is_deleted,
      m.createtime,
      m.updatetime,
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

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.id), '[]'::JSONB)
  INTO v_updates
  FROM (
    SELECT
      m.id,
      m.sender_type,
      m.msg_type,
      m.content,
      m.attachment_url,
      m.attachment_name,
      m.attachment_mime,
      m.is_deleted,
      m.createtime,
      m.updatetime,
      CASE
        WHEN m.sender_type = 'staff' THEN COALESCE(u.nickname, u.username, 'เจ้าหน้าที่')
        WHEN m.sender_type = 'member' THEN COALESCE(mu.nickname, mu.username, 'สมาชิก')
        ELSE 'ระบบ'
      END AS sender_name
    FROM service_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    LEFT JOIN service_conversations c ON c.id = m.conversation_id
    LEFT JOIN users mu ON mu.id = c.user_id
    WHERE m.conversation_id = p_conversation_id
      AND m.id <= COALESCE(p_after_id, 0)
      AND m.updatetime > COALESCE(p_updates_since, 0)
      AND m.updatetime > m.createtime
    ORDER BY m.id
    LIMIT 100
  ) t;

  UPDATE service_conversations
  SET unread_member = 0, updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('messages', v_msgs, 'updates', v_updates);
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
      sm.msg_type,
      sm.content,
      sm.attachment_url,
      sm.attachment_name,
      sm.attachment_mime,
      sm.is_deleted,
      sm.createtime,
      sm.updatetime,
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

-- Storage policies for chat attachments
DROP POLICY IF EXISTS "site_assets_service_chat_member_insert" ON storage.objects;
CREATE POLICY "site_assets_service_chat_member_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'service-chat'
    AND (storage.foldername(name))[2] = ('u' || fn_current_db_user_id()::TEXT)
  );

DROP POLICY IF EXISTS "site_assets_service_chat_guest_insert" ON storage.objects;
CREATE POLICY "site_assets_service_chat_guest_insert"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'service-chat'
    AND (storage.foldername(name))[2] = 'guest'
  );

DROP POLICY IF EXISTS "site_assets_service_chat_staff_insert" ON storage.objects;
CREATE POLICY "site_assets_service_chat_staff_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'service-chat'
    AND (storage.foldername(name))[2] = 'staff'
    AND fn_current_user_role() IN ('admin'::user_role, 'agent'::user_role)
  );

GRANT EXECUTE ON FUNCTION public.service_send_chat_message(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_reply_service_chat(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.service_recall_chat_message(BIGINT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_recall_service_chat_message(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.service_poll_chat_messages(BIGINT, TEXT, BIGINT, BIGINT) TO authenticated, anon;

COMMIT;
