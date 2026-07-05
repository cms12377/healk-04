# Supabase migration order

Run scripts in **Supabase SQL Editor** in this order. Each step depends on the previous ones.

## 1. Bootstrap (required once)

| # | File | Purpose |
|---|------|---------|
| 1 | `../database.sql` | Schema, seed data, base RPCs |
| 2 | `admin_setup.sql` | Roles, pending deposit/withdraw, admin RPCs |
| 3 | `game_betting.sql` | Betting, settlement, game advance |
| 4 | `auth_setup.sql` | Auth trigger (if not in database.sql) |

## 2. Member wallet & security (required for production)

| # | File | Purpose |
|---|------|---------|
| 5 | `fix_pgcrypto_pay_password.sql` | Pay password bcrypt (`gen_salt`) |
| 6 | `fix_deposit_submit.sql` | Pending deposits + payer/slip fields |
| 7 | `fix_submit_rpc_overloads.sql` | Remove old RPC overload conflicts |
| 8 | `fix_assert_member_manage.sql` **or** `fix_admin_member_crud.sql` | `fn_assert_member_manage` (required before pay-password admin RPCs) |
| 9 | `fix_pay_password_member_lock.sql` | One-time member set; admin reset |
| 10 | `fix_bank_cards_member.sql` | Member add bank/crypto (RLS + RPC) |
| 11 | `fix_member_uploads_storage.sql` | Storage bucket for slips/KYC/avatar |
| 12 | `fix_member_avatar.sql` | Avatar TEXT + `member_update_profile` |
| 13 | `fix_identity_kyc.sql` | KYC submit + admin review |

## 3. Admin panel parity

| # | File | Purpose |
|---|------|---------|
| 14 | `fix_admin_member_crud.sql` | Member edit/block/delete (full; skip if step 8 used minimal patch) |
| 15 | `fix_admin_th6688_menus.sql` | Pending stats, member payment view |
| 16 | `fix_admin_agent_orders.sql` | Deposit proof + withdraw details in lists |
| 17 | `fix_admin_recharge_channels.sql` | Deposit account CRUD |
| 18 | `fix_recharge_qrcode_storage.sql` | Admin QR upload |
| 19 | `fix_admin_cms.sql` | Site settings + game admin RPCs |
| 20 | `fix_admin_bonus_cms.sql` | Promotions, VIP, notices |
| 21 | `fix_internal_service_chat.sql` | Service chat |
| 22 | `fix_service_chat_media.sql` | Chat attachments + recall |

## 4. Games & realtime (as needed)

| # | File | Purpose |
|---|------|---------|
| 23 | `fix_draw_mode.sql` | Manual/random draw mode |
| 24 | `fix_th6688_parity.sql` | Issue format, bet cutoff |
| 25 | `fix_th6688_fair_draw.sql` | Fair random draw |
| 26 | `fix_th6688_runtime_defaults.sql` | Auto-draw defaults |
| 27 | `fix_balance_realtime.sql` | Balance realtime |
| 28 | `fix_game_realtime.sql` | Game issue realtime |
| 29 | `fix_game_issues_countdown.sql` | Countdown refresh |
| 30 | Game catalog fixes | `fix_pk10_*`, `fix_k3_*`, `fix_ssc_*`, `fix_marksix_*`, `fix_other_games.sql` |
| 31 | `fix_scheduled_draw_results.sql` | Admin bulk draw schedule (table + RPCs) |
| 32 | `fix_scheduled_draw_countdown.sql` | Fix rapid draws / restore 5-min countdown after schedule |
| 33 | `fix_scheduled_draw_alignment.sql` | Align schedule issue # with open issue + future slots only |
| 34 | `fix_scheduled_draw_sort_cleanup.sql` | Sort upcoming first; purge used after 1h |
| 35 | `fix_scheduled_draw_time_window.sql` | Random → admin window overlay → random again (preferred) |
| 36 | `fix_scheduled_draw_issue_align.sql` | Match presets to live issue # + align draw_time to game cycle |
| 37 | `fix_scheduled_draw_issue_gap.sql` | Gap random (021-024) → preset (025-029) → random (030+) — **run this** |
| 38 | `fix_scheduled_draw_sequential.sql` | Fix 032 → 033 (not 041) — ignore schedule in fn_next_issue_number |
| 39 | `remove_withdraw_limits.sql` | Remove withdraw min/max limits (allow any amount > 0) |

## 5. Optional

| File | Purpose |
|------|---------|
| `fix_member_invite.sql` | Agent invite on signup |
| `fix_service_url.sql` | External service URL seed |
| `fix_remove_member_win_rate.sql` | Remove biased win-rate engine |
| `fix_admin_th6688_menus.sql` | Already in step 14 |

## Quick verify after migrations

1. **Member:** register → set pay password → bind bank → deposit (pending) → withdraw (pending)
2. **Admin:** approve deposit/withdraw → member balance updates
3. **Admin:** KYC queue at `#/admin/identity` (not `#/identityCard`)
4. **Member:** `#/identityCard` for self KYC; `#/bindBank` for bank bind
5. **Avatar:** `#/profit` upload after step 10–11

## Common errors

| Error | Run |
|-------|-----|
| `gen_salt does not exist` | `fix_pgcrypto_pay_password.sql` |
| `Could not find the function member_add_bank_card` | `fix_bank_cards_member.sql` |
| `function fn_assert_member_manage(bigint) does not exist` | `fix_assert_member_manage.sql` |
| `admin_set_member_status` / `admin_delete_member` not found | `fix_admin_member_crud.sql` |
| `Could not find the function member_update_profile` | `fix_member_avatar.sql` |
| Deposit credits instantly (no admin queue) | `admin_setup.sql` + `fix_deposit_submit.sql` |
| Storage upload failed | `fix_member_uploads_storage.sql` |
