export interface ThaiBankOption {
  id: string
  name: string
}

/** Thai banks for member bind-bank (matches th6688 /api/index/bank shape). */
export const THAI_BANKS: ThaiBankOption[] = [
  { id: '1', name: 'ธนาคารกสิกรไทย' },
  { id: '2', name: 'ธนาคารกรุงเทพ' },
  { id: '3', name: 'ธนาคารกรุงไทย' },
  { id: '4', name: 'ธนาคารไทยพาณิชย์' },
  { id: '5', name: 'ธนาคารทหารไทยธนชาต' },
  { id: '6', name: 'ธนาคารกรุงศรีอยุธยา' },
  { id: '7', name: 'ธนาคารเกียรตินาคินภัทร' },
  { id: '8', name: 'ธนาคารซีไอเอ็มบีไทย' },
  { id: '9', name: 'ธนาคารยูโอบี' },
  { id: '10', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์' },
  { id: '11', name: 'ธนาคารออมสิน' },
  { id: '12', name: 'ธนาคารอาคารสงเคราะห์' },
  { id: '13', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร' },
  { id: '14', name: 'ธนาคารทิสโก้' },
  { id: '15', name: 'ธนาคารไอซีบีซี (ไทย)' },
  { id: '16', name: 'ธนาคารเมกะ สากลพาณิชย์' },
  { id: '17', name: 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)' },
  { id: '18', name: 'ธนาคารฮ่องกงและเซี่ยงไฮ้' },
  { id: '19', name: 'ธนาคารไทยเครดิต' },
  { id: '20', name: 'TrueMoney Wallet' },
]

export function getThaiBankById(id: string): ThaiBankOption | undefined {
  return THAI_BANKS.find((b) => b.id === id)
}
