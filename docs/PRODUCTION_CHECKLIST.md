# Production checklist — Member ↔ Admin

ใช้ก่อน deploy production จริง (แนะนำทดสอบบน staging ที่ใช้ Supabase project เดียวกับ production)

## 1. Automated (รันบนเครื่อง dev / CI)

```bash
yarn build          # TypeScript + Vite production bundle
yarn verify         # เกม + catalog counts
yarn verify:prod    # RPC, storage, routing sanity
```

## 2. SQL migrations (Supabase SQL Editor)

รันตามลำดับใน [`supabase/MIGRATION_ORDER.md`](../supabase/MIGRATION_ORDER.md) อย่างน้อยขั้นตอน 1–2 และ admin (13–19) ถ้าใช้ศูนย์ผู้ดูแลครบ

| ถ้าเจอ error | รันไฟล์ |
|--------------|---------|
| `gen_salt does not exist` | `fix_pgcrypto_pay_password.sql` |
| `member_add_bank_card` ไม่พบ | `fix_bank_cards_member.sql` |
| `member_update_profile` ไม่พบ | `fix_member_avatar.sql` |
| อัปโหลดรูป/slip ล้มเหลว | `fix_member_uploads_storage.sql` |
| ฝากเข้ายอดทันที (ไม่รอ admin) | `admin_setup.sql` + `fix_deposit_submit.sql` |

## 3. Manual E2E — สมาชิก

ทดสอบด้วยบัญชี **member ธรรมดา** (ไม่ใช่ admin/agent):

| # | ขั้นตอน | URL / หน้า | ผลที่คาดหวัง |
|---|---------|------------|--------------|
| M1 | สมัคร + login | `#/register` → `#/login` | เข้าระบบได้ |
| M2 | ตั้งรหัสเงินทุน (ครั้งแรก) | `#/setPwd?type=1` | ตั้งได้ครั้งเดียว |
| M3 | ผูกบัญชีธนาคาร | `#/bindBank` | **Member app** (ไม่ redirect admin), บันทึกสำเร็จ |
| M4 | ดูบัตร | `#/cards` | แสดงบัตรที่ผูก |
| M5 | ฝากเงิน | `#/recharge` → ส่ง slip | สถานะ **รอดำเนินการ**, ยอดยังไม่เพิ่ม |
| M6 | ถอนเงิน | `#/withdraw` | สถานะ **รอดำเนินการ** |
| M7 | KYC | `#/identityCard` | ส่งเอกสารได้, สถานะรอตรวจ |
| M8 | เปลี่ยนรูปโปรไฟล์ | `#/profit` | อัปโหลด Storage สำเร็จ, รูปแสดงหลัง refresh |
| M9 | เดิมพัน | เกมใดเกมหนึ่ง | ตัดยอด, มีประวัติ `#/gameBet` |
| M10 | ภาษา | จาก `#/my` → ภาษา | กลับ `#/my` ได้ (ไม่ติด sub-route) |

## 4. Manual E2E — ผู้ดูแล / Agent

ทดสอบด้วยบัญชี **admin หรือ agent** (`fn_is_staff` = true):

| # | ขั้นตอน | URL | ผลที่คาดหวัง |
|---|---------|-----|--------------|
| A1 | เมนูศูนย์ผู้ดูแล | `#/admin` | เห็น pending counts |
| A2 | อนุมัติฝาก | `#/rechargeAdmin` | อนุมัติ M5 → ยอด member เพิ่ม |
| A3 | อนุมัติถอน | `#/depositAdmin` | อนุมัติ M6 → ยอด member ลด |
| A4 | คิว KYC | `#/admin/identity` | **ไม่ใช่** `#/identityCard` |
| A5 | สมาชิก → drill-down | `#/huiYuan` → เปิดสมาชิก | ปุ่ม ฝาก/ถอน/เดิมพัน/บัญชี ไป `#/hyChong?user_id=` ฯลฯ |
| A6 | รีเซ็ตรหัสเงินทุน | แก้ไขสมาชิก | member ตั้งใหม่ได้ |
| A7 | จัดการเกม (admin only) | `#/admin/games` | เปิด/ปิด, draw mode, advance |
| A8 | บัญชีรับฝาก | `#/admin/deposit-accounts` | CRUD QR/channel |

## 5. Cross-check สำคัญ (member ↔ admin)

1. **ฝาก:** member ส่ง → admin เห็นใน rechargeAdmin → อนุมัติ → member balance/realtime อัปเดต
2. **ถอน:** member ขอถอน → admin เห็นใน depositAdmin → อนุมัติ/ปฏิเสธ
3. **KYC:** member `#/identityCard` ↔ admin `#/admin/identity`
4. **bindBank:** member `#/bindBank` อยู่ member app; agent ดู `#/bindBank?user_id=X` อยู่ admin
5. **Non-staff** เปิด `#/rechargeAdmin` → redirect `#/my`

## 6. Production deploy

- [ ] `yarn build` สำเร็จ
- [ ] Env production: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Supabase Auth: ปิด confirm email ถ้าต้องการ login ทันทีหลังสมัคร
- [ ] Cron/advance games: `yarn cron:games` หรือ Edge Function ถ้าใช้ auto-draw
- [ ] ไม่ commit `.env` ที่มี key จริง

## 7. Smoke test หลัง deploy

1. Login member + admin คนละแท็บ
2. ฝากทดสอบจำนวนน้อย → อนุมัติ → ตรวจยอด
3. เปิดเกม 1 รอบ ดู countdown + ผลออก
