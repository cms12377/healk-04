export type DrawMode = 'random' | 'manual'

export const DRAW_RESULT_HINTS: Record<string, { example: string; hint: string }> = {
  df_pk10: {
    example: '3,7,1,10,5,2,9,4,8,6',
    hint: 'PK10: 10 ตัวเลข 1–10 ไม่ซ้ำ คั่นด้วย comma',
  },
  df_pk10_3: {
    example: '3,7,1,10,5,2,9,4,8,6',
    hint: 'PK10: 10 ตัวเลข 1–10 ไม่ซ้ำ คั่นด้วย comma',
  },
  df_pk10_5: {
    example: '3,7,1,10,5,2,9,4,8,6',
    hint: 'PK10: 10 ตัวเลข 1–10 ไม่ซ้ำ คั่นด้วย comma',
  },
  df_k3: {
    example: '2,5,2',
    hint: 'K3: 3 ลูกเต๋า แต่ละลูก 1–6',
  },
  xam_6: {
    example: '12,28,7,33,41,19,5',
    hint: 'Mark Six: 7 ตัวเลข 1–49 ไม่ซ้ำ (ตัวสุดท้าย=特码)',
  },
  xy_28: {
    example: '3,7,2',
    hint: 'Lucky 28: 3 ตัวเลข 0–9',
  },
  df_ssc: {
    example: '3,7,1,0,9',
    hint: 'หวยรัฐบาล: 5 ตัวเลข 0–9',
  },
}

export function getDrawResultHint(code: string): { example: string; hint: string } {
  return (
    DRAW_RESULT_HINTS[code] ?? {
      example: '',
      hint: 'รูปแบบผลไม่รู้จัก — ตรวจสอบ code เกม',
    }
  )
}

export function drawModeLabel(mode: DrawMode): string {
  return mode === 'manual' ? 'กำหนดผลเอง' : 'อัตโนมัติ (th6688)'
}

export function drawModeDescription(mode: DrawMode): string {
  if (mode === 'manual') {
    return 'ผู้ดูแลกำหนดผลล่วงหน้า — ถ้าไม่ตั้งค่า ระบบสุ่มผลแบบ th6688 แทน'
  }
  return 'สุ่มผลอย่างเป็นธรรม — บ้านได้เปรียบจากอัตราจ่าย (odds) เท่านั้น'
}
