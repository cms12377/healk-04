/**
 * Thai display labels aligned with th6688.vip (locale `th`, common.a* / pkShi.e*)
 * DB may store Chinese keys in name/label — UI always shows Thai.
 */

const GROUP_BY_CODE: Record<string, string> = {
  lm: 'สองด้าน',
  lm28: 'สองด้าน',
  gy: 'ผลรวม',
  gyj: 'ผลรวม',
  hz: 'ผลรวม',
  hz28: 'ผลรวม',
  k3lm: 'สองด้าน',
  ball1: 'ลูกที่ 1',
  b2: 'ลูกที่ 2',
  b3: 'ลูกที่ 3',
  b4: 'ลูกที่ 4',
  b5: 'ลูกที่ 5',
  nn: 'บิว',
  tm: 'รางวัลพิเศษ',
  zm: 'รางวัลหลัก',
  tx: 'นักษัตรพิเศษ',
  zx: 'นักษัตรหลัก',
  bs: 'สีคลื่น',
  sth: 'ตอง',
  slh: 'เรียง',
  sbdh: 'ไม่ซ้ำ 3 ลูก',
  eth: 'คู่เดียวกัน',
  ebdh: 'ไม่ซ้ำ 2 ลูก',
  etdx: 'คู่+เดี่ยว',
}

const GROUP_BY_NAME: Record<string, string> = {
  两面盘: 'สองด้าน',
  两面: 'สองด้าน',
  冠亚军和: 'ผลรวม',
  冠亚季: 'ผลรวม',
  冠亚季和: 'ผลรวม',
  和值: 'ผลรวม',
  选号: 'เลือกหมายเลข',
  冠军: 'อันดับ1',
  亚军: 'อันดับ2',
  第三名: 'อันดับ3',
  第四名: 'อันดับ4',
  第五名: 'อันดับ5',
  第六名: 'อันดับ6',
  第七名: 'อันดับ7',
  第八名: 'อันดับ8',
  第九名: 'อันดับ9',
  第十名: 'อันดับ10',
  '冠亚军和-大小单双': 'ผลรวม — ใหญ่/เล็ก/คี่/คู่',
  第一球: 'ลูกที่ 1',
  第二球: 'ลูกที่ 2',
  第三球: 'ลูกที่ 3',
  第四球: 'ลูกที่ 4',
  第五球: 'ลูกที่ 5',
  三同号: 'ตอง',
  三连号: 'เรียง',
  三不同号: 'ไม่ซ้ำ 3 ลูก',
  二同号: 'คู่เดียวกัน',
  二不同号: 'ไม่ซ้ำ 2 ลูก',
  二同单选: 'คู่+เดี่ยว',
  全顺: 'เรียงครบ',
  特码: 'รางวัลพิเศษ',
  正码: 'รางวัลหลัก',
  特肖: 'นักษัตรพิเศษ',
  正肖: 'นักษัตรหลัก',
  波色: 'สีคลื่น',
  牛牛: 'บิว',
}

const BET_LABEL: Record<string, string> = {
  大: 'สูง',
  小: 'ต่ำ',
  单: 'คี่',
  双: 'คู่',
  龙: 'มังกร',
  虎: 'เสือ',
  和: 'เสมอ',
  总大: 'รวมใหญ่',
  总小: 'รวมเล็ก',
  总单: 'รวมคี่',
  总双: 'รวมคู่',
  三连号: 'ลูกเรียง',
  全顺: 'เรียงครบทุกแบบ',
  ใหญ่: 'ใหญ่',
  เล็ก: 'เล็ก',
  คี่: 'คี่',
  คู่: 'คู่',
  มังกร: 'มังกร',
  เสือ: 'เสือ',
  红波: 'แดง',
  绿波: 'เขียว',
  蓝波: 'น้ำเงิน',
  无牛: 'ไม่มีบิว',
  niuniu: 'บิว',
  wuniu: 'ไม่มีบิว',
  牛1: 'บิว 1',
  牛2: 'บิว 2',
  牛3: 'บิว 3',
  牛4: 'บิว 4',
  牛5: 'บิว 5',
  牛6: 'บิว 6',
  牛7: 'บิว 7',
  牛8: 'บิว 8',
  牛9: 'บิว 9',
  niu1: 'บิว 1',
  niu2: 'บิว 2',
  niu3: 'บิว 3',
  niu4: 'บิว 4',
  niu5: 'บิว 5',
  niu6: 'บิว 6',
  niu7: 'บิว 7',
  niu8: 'บิว 8',
  niu9: 'บิว 9',
}

const ZODIAC_LABEL: Record<string, string> = {
  鼠: 'ชวด',
  牛: 'ฉลู',
  虎: 'ขาล',
  兔: 'เถาะ',
  龙: 'มังกร',
  蛇: 'มะเส็ง',
  马: 'ม้า',
  羊: 'แพะ',
  猴: 'ลิง',
  鸡: 'ระกา',
  狗: 'จอ',
  猪: 'กุน',
}

export const PK10_MAIN_TABS = {
  twoSide: 'สองด้าน',
  sum: 'ผลรวม',
  rank: 'อันดับ 1–10',
} as const

export type Pk10MainTabKey = keyof typeof PK10_MAIN_TABS

export const LUCKY28_MAIN_TABS = {
  integrate: 'สองด้าน',
  balls: 'ลูกที่ 1–3',
  sum: 'ผลรวม',
} as const

export type Lucky28MainTabKey = keyof typeof LUCKY28_MAIN_TABS

export const SSC_MAIN_TABS = {
  twoSide: 'สองด้าน',
  balls: 'ลูก 1–5',
} as const

export type SscMainTabKey = keyof typeof SSC_MAIN_TABS

export function translateGroupName(code: string, name: string): string {
  if (/[\u0E00-\u0E7F]/.test(name)) return name
  if (GROUP_BY_CODE[code]) return GROUP_BY_CODE[code]
  if (GROUP_BY_NAME[name]) return GROUP_BY_NAME[name]
  const rankMatch = code.match(/^r(\d+)$/)
  if (rankMatch) return `อันดับ${rankMatch[1]}`
  return name
}

export function translateCategoryName(name: string): string {
  return GROUP_BY_NAME[name] ?? name
}

export function translateBetLabel(label: string): string {
  return BET_LABEL[label] ?? label
}

export function translateZodiacLabel(label: string): string {
  return ZODIAC_LABEL[label] ?? translateBetLabel(label)
}

export function isRankGroupCode(code: string): boolean {
  return /^r\d+$/.test(code)
}

export function isSumGroupCode(code: string): boolean {
  return code === 'gy' || code === 'gyj' || code === 'hz' || code === 'hz28'
}

const SUM_CATEGORY_HEADER: Record<string, string> = {
  gy: 'ผลรวม',
  gyj: 'ผลรวม อันดับ1–3',
}

export function translateSumCategoryHeader(code: string, name: string): string {
  return SUM_CATEGORY_HEADER[code] ?? translateGroupName(code, name)
}

export function isTwoSideGroupCode(code: string): boolean {
  return code === 'lm' || code === 'k3lm' || code === 'lm28'
}
