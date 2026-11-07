# Supabase — หัวใจระบบ + ลำดับรันสำหรับโปรเจกต์ใหม่

โปรเจกต์นี้ **ไม่มีโฟลเดอร์ `supabase/migrations` แบบ CLI**  
ฐานข้อมูลถูกสร้างด้วย SQL 61 ไฟล์ที่รันมือใน **Supabase SQL Editor**

| รวมไฟล์ `.sql` | รันบนโปรเจกต์ว่าง | ข้าม |
|----------------|-------------------|------|
| 61 (`database.sql` + `supabase/*.sql`) | **50 บังคับ + 1 แนะนำ** | **10** |

รันทีละไฟล์ตามเลขด้านล่าง (คัดลอกทั้งไฟล์ → Run)  
ไฟล์หลังทับฟังก์ชันของไฟล์ก่อน — **ห้ามสลับหมวดที่ระบุว่าทับ RPC**

---

## หัวใจระบบ (ชั้นที่ทับกัน)

```
database.sql          ตารางหลัก 24 ตัว + seed เกม 7 ตัว + Auth trigger
        ↓
admin_setup.sql       role admin/agent + คิวฝาก/ถอน + RPC ศูนย์ผู้ดูแล
        ↓
game_betting.sql      เดิมพัน → ตัดสิน → เปิดงวดใหม่ (หัวใจเกม)
        ↓
patch กระเป๋า/KYC/แอดมิน/แชท/catalog
        ↓
draw engine           โหมดออกผล + รูปแบบงวด + สุ่มยุติธรรม
        ↓
scheduled_draw_*      ตารางตั้งผลล่วงหน้า — ไฟล์หลังสุดเป็นเวอร์ชันที่ใช้จริง
        ↓
block / withdraw      ล็อกสมาชิก + ตัดยอดถอนครั้งสุดท้าย
```

**ตารางที่ `database.sql` สร้าง (24):**  
`site_settings`, `site_banners`, `winning_feed`, `activities`, `vip_tiers`, `game_rules`,  
`users`, `user_sessions`, `user_bank_cards`, `user_crypto_wallets`, `recharge_channels`,  
`withdraw_settings`, `money_categories`, `user_money_logs`, `deposit_orders`, `withdraw_orders`,  
`game_categories`, `games`, `play_groups`, `play_categories`, `play_items`,  
`game_issues`, `draw_results`, `bet_records`, `user_notices`, `user_notice_reads`

**ตารางที่ไฟล์หลังเพิ่ม (ต้องรันถึงจะครบต้นฉบับ):**

| ไฟล์ | ตารางใหม่ |
|------|-----------|
| `fix_scheduled_draw_results.sql` | `scheduled_draw_results` |
| `fix_internal_service_chat.sql` | `service_conversations`, `service_messages` |

**คอลัมน์สำคัญที่ไฟล์หลังเพิ่มบน `users`:**  
`role` (admin_setup) · `real_name` / `id_number` / `identity_status` (deposit) ·  
`identity_front_url` / `identity_back_url` (KYC)

ยอดเงินจริงอยู่ที่ `users.money` ไม่ใช่คอลัมน์ `balance`

---

## ไฟล์ที่ห้ามรันบนโปรเจกต์ว่าง (10)

| ไฟล์ | เหตุผล |
|------|--------|
| `auth_setup.sql` | รวมใน `database.sql` แล้ว |
| `submit_bet.sql` | เวอร์ชันเก่า — `game_betting.sql` ทับทั้งหมด |
| `fix_assert_member_manage.sql` | ชุดย่อยของ `fix_admin_member_crud.sql` |
| `fix_scheduled_draw_wallclock.sql` | **DEPRECATED** — หยุดเกมก่อนหน้าต่างเวลา |
| `rpc_test_prereq.sql` | สำหรับสคริปต์เทสเท่านั้น |
| `patch_test_force_advance.sql` | มีใน `game_betting.sql` แล้ว |
| `patch_settle_for_update.sql` | แพตช์เก่า — ไฟล์หลังทับ settle แล้ว |
| `verify_game_catalog.sql` | อ่านอย่างเดียว ใช้ตรวจหลังรันครบ |
| `fix_remove_member_win_rate.sql` | สำหรับโปรเจกต์เก่าที่มี casino engine — ถ้ารันจะทับ RPC แอดมินชุดใหม่ |
| `fix_service_url.sql` | ค่าเดียวกันถูก seed ใน `database.sql` แล้ว |

---

## ลำดับรันโปรเจกต์ว่าง (50 บังคับ + ข้อ 51 แนะนำ)

คัดลอกจากรากโปรเจกต์ ยกเว้นข้อ 1 ที่อยู่ที่ราก

### 1. Bootstrap — รันครั้งแรก ห้ามข้าม (3)

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 1 | `database.sql` | schema + seed + Auth `handle_new_auth_user` |
| 2 | `supabase/admin_setup.sql` | `users.role`, คิวฝาก/ถอน, RPC แอดมินพื้นฐาน |
| 3 | `supabase/game_betting.sql` | `submit_bets`, `advance_game_round`, `fn_settle_issue_bets` |

### 2. กระเป๋าสมาชิก (5)

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 4 | `fix_pgcrypto_pay_password.sql` | `pgcrypto` + bcrypt รหัสเงินทุน |
| 5 | `fix_deposit_submit.sql` | ฝากแบบรอแอดมิน (payer/slip) |
| 6 | `fix_admin_member_crud.sql` | แก้/บล็อก/ลบสมาชิก (`fn_assert_member_manage`) |
| 7 | `fix_pay_password_member_lock.sql` | สมาชิกตั้งรหัสเงินทุนได้ครั้งเดียว; แอดมินรีเซ็ต |
| 8 | `fix_bank_cards_member.sql` | ผูกบัญชีธนาคาร (RLS + RPC) |

### 3. Storage + KYC (5)

ต้องสร้างบัคเก็ต **ก่อน** อัปโหลดสลิป/KYC/รูป — QR แอดมินสร้างบัคเก็ต `site-assets`

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 9 | `fix_recharge_qrcode_storage.sql` | บัคเก็ต + นโยบายแอดมินอัป QR |
| 10 | `fix_member_uploads_storage.sql` | นโยบายสมาชิก (slip / KYC / avatar) |
| 11 | `fix_member_avatar.sql` | `member_update_profile` |
| 12 | `fix_identity_kyc.sql` | ส่ง KYC + คิวตรวจ |
| 13 | `fix_submit_rpc_overloads.sql` | ลบ RPC ลายเซ็นเก่าที่ชนกับ PostgREST |

### 4. ศูนย์ผู้ดูแล + แชท (7)

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 14 | `fix_admin_th6688_menus.sql` | pending stats, ดูช่องทางจ่ายของสมาชิก |
| 15 | `fix_admin_agent_orders.sql` | รายการฝากมีสลิป / ถอนมีรายละเอียด |
| 16 | `fix_admin_recharge_channels.sql` | CRUD บัญชีรับฝาก |
| 17 | `fix_admin_cms.sql` | ตั้งค่าเว็บ + จัดการเกม |
| 18 | `fix_admin_bonus_cms.sql` | โปรโมชั่น, VIP, ประกาศ |
| 19 | `fix_internal_service_chat.sql` | แชทบริการ (ตาราง + RPC) |
| 20 | `fix_service_chat_media.sql` | แนบไฟล์ + เรียกคืนข้อความ |

### 5. Catalog เกมให้ครบต้นฉบับ (10)

`database.sql` seed แคตตาล็อกบางส่วน — **ต้องรันชุดนี้** ถึง `yarn verify` จะผ่าน (กลุ่มเล่นครบ 7 เกม)

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 21 | `play_items_full.sql` | แคตตาล็อกเต็ม (PK10 / K3 / Mark Six / Lucky28 / SSC) |
| 22 | `fix_pk10_categories.sql` | แท็บสองด้านต่ออันดับ |
| 23 | `fix_pk10_full_catalog.sql` | 冠亚军和 + มังกร/เสือ + ชิปเดิมพัน |
| 24 | `fix_pk10_gy_sum_odds_100.sql` | อัตรา 3/4/18/19 = 100 |
| 25 | `fix_k3_full_catalog.sql` | เมนู K3 ครบ 7 กลุ่ม |
| 26 | `fix_other_games.sql` | กลุ่มที่ขาดของเกมที่ไม่ใช่ PK10 |
| 27 | `fix_ssc_lucky28_th6688_catalog.sql` | SSC + Lucky28 สองด้าน |
| 28 | `fix_ssc_legacy_sides.sql` | ซ่อนรายการซ้ำของ SSC |
| 29 | `fix_marksix_th6688_ui.sql` | แท็บ Mark Six |
| 30 | `fix_marksix_th6688_parity.sql` | อัตรา/ป้าย Mark Six (รันหลัง UI) |

### 6. เครื่องออกผล + Realtime (7)

ไฟล์เหล่านี้ทับ `advance_game_round` ตามลำดับ — รันต่อเนื่องห้ามข้ามกลางทาง

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 31 | `fix_draw_mode.sql` | สุ่ม / กำหนดผลเอง |
| 32 | `fix_th6688_parity.sql` | รูปแบบงวด + ปิดรับก่อนออกผล |
| 33 | `fix_th6688_fair_draw.sql` | สุ่มยุติธรรม (ตัด casino เก่า) |
| 34 | `advance_due_games.sql` | `advance_all_due_games` (cron / สคริปต์) |
| 35 | `fix_th6688_runtime_defaults.sql` | ค่าเริ่มต้น auto-draw |
| 36 | `fix_game_realtime.sql` | Realtime `game_issues` + `draw_results` |
| 37 | `fix_balance_realtime.sql` | Realtime `users` + `user_money_logs` |

### 7. ตั้งผลล่วงหน้า (8) — ต้องครบสาย ไม่ข้ามไปไฟล์ท้ายอย่างเดียว

สร้างตารางที่ข้อ 38 แล้วไฟล์ 39–45 ทับ logic จนได้พฤติกรรมปัจจุบัน

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 38 | `fix_scheduled_draw_results.sql` | ตาราง + RPC ตั้งผลเป็นชุด |
| 39 | `fix_scheduled_draw_countdown.sql` | กันออกผลรัวเมื่อ countdown = 0 |
| 40 | `fix_scheduled_draw_alignment.sql` | จูนเลขงวดกับงวดเปิด |
| 41 | `fix_scheduled_draw_sort_cleanup.sql` | เรียงคิว + ลบที่ใช้แล้ว |
| 42 | `fix_scheduled_draw_time_window.sql` | นอกหน้าต่าง = สุ่ม, ในหน้าต่าง = ตามที่ตั้ง |
| 43 | `fix_scheduled_draw_issue_align.sql` | จับเลขงวดจริง + รอบเวลาเกม |
| 44 | `fix_scheduled_draw_issue_gap.sql` | ช่องว่างระหว่างงวด = สุ่ม จนถึงช่องที่ตั้งไว้ |
| 45 | `fix_scheduled_draw_sequential.sql` | งวดสมาชิกเดิน 032→033 (ไม่กระโดดตามตารางตั้ง) |

จากนั้นรีเซ็ตนาฬิกางวดเปิด:

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 46 | `fix_game_issues_countdown.sql` | เลื่อนงวดที่เลยเวลา + ตั้ง countdown ตามรอบเกม |

### 8. ถอนเงิน + บัญชีถูกบล็อก (4)

ทับ `submit_bets` / `submit_withdraw` / `submit_deposit` เป็นเวอร์ชันสุดท้าย

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 47 | `remove_withdraw_limits.sql` | ถอนได้ทุกจำนวน > 0 |
| 48 | `block_member_transactions.sql` | `status=0` ห้ามเดิมพัน/ฝาก/ถอน |
| 49 | `fix_withdraw_balance_column.sql` | ตัดยอดจาก `users.money` (เวอร์ชันสุดท้ายของถอน+เดิมพัน) |
| 50 | `block_member_readonly.sql` | บล็อกแล้วยังล็อกอินได้ แต่ห้ามแก้โปรไฟล์/บัตร/KYC/ฝาก |

### 9. แนะนำให้เหมือนต้นฉบับ (1)

| # | ไฟล์ | ทำอะไร |
|---|------|--------|
| 51 | `fix_member_invite.sql` | ผูก `invited_by` จากรหัสเชิญตอนสมัคร |
| 52 | `fix_count_issue_wins.sql` | helper ที่ต้นฉบับมีแล้ว แต่ไฟล์ SQL เดิมไม่ได้ลง — `advance_game_round` ใช้ |

---

## หลังรัน SQL

1. **Authentication → Email:** ปิด Confirm email ถ้าต้องการเข้าได้ทันทีหลังสมัคร  
2. สมัครสมาชิกผ่านแอป แล้วตั้งแอดมินใน SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

3. ชี้แอปที่โปรเจกต์นี้ใน `.env.local` (gitignored):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   -- anon เท่านั้น ห้ามใส่ service_role ใน frontend
```

4. รีสตาร์ท `yarn dev` แล้วตรวจ:

```bash
yarn verify
yarn verify:prod
```

5. เกม 1 นาที (K3 / SSC) ต้องมี cron: `yarn cron:games` หรือเรียก `advance_all_due_games` เป็นระยะ

---

## RPC ที่ทับกัน (เวอร์ชันสุดท้ายหลังรันครบ 50)

| ฟังก์ชัน | ไฟล์ที่เป็นตัวจริง |
|----------|-------------------|
| `submit_bets` | `fix_withdraw_balance_column.sql` |
| `submit_withdraw` | `fix_withdraw_balance_column.sql` |
| `submit_deposit` | `block_member_readonly.sql` |
| `set_pay_password` | `block_member_readonly.sql` |
| `advance_game_round` | `fix_scheduled_draw_issue_gap.sql` (แล้ว `fn_next_issue_number` จาก sequential) |
| `fn_next_issue_number` | `fix_scheduled_draw_sequential.sql` |
| `admin_list_members` | `fix_admin_th6688_menus.sql` (มีแพตช์ pay-password มาก่อนแล้ว) |

---

## ตรวจหลัง migrate

1. สมาชิก: สมัคร → ตั้งรหัสเงินทุน → ผูกธนาคาร → ฝาก (รอ) → ถอน (รอ)  
2. แอดมิน: อนุมัติฝาก/ถอน → ยอดสมาชิกเปลี่ยน  
3. KYC: สมาชิก `#/identityCard` · แอดมิน `#/admin/identity`  
4. Catalog: PK10 มี `play_groups` ≥ 13 ต่อเกม, K3 = 7, Mark Six ≥ 5, Lucky28 ≥ 5, SSC ≥ 7  

อ่านอย่างเดียว: `supabase/verify_game_catalog.sql`

---

## Error ที่พบบ่อย

| Error | รันไฟล์ |
|-------|---------|
| `gen_salt does not exist` | `fix_pgcrypto_pay_password.sql` |
| `member_add_bank_card` ไม่พบ | `fix_bank_cards_member.sql` |
| `fn_assert_member_manage` ไม่พบ | `fix_admin_member_crud.sql` |
| `admin_set_member_status` / `admin_delete_member` ไม่พบ | `fix_admin_member_crud.sql` |
| `member_update_profile` ไม่พบ | `fix_member_avatar.sql` |
| ฝากเข้ายอดทันที | `admin_setup.sql` + `fix_deposit_submit.sql` |
| อัปโหลด Storage ล้มเหลว | ข้อ 9 แล้วข้อ 10 |
| `advance_all_due_games` ไม่พบ | `advance_due_games.sql` |
