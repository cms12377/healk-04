/**. AoLiu — zodiac → associated Mark Six numbers (2026 table) */
export const MARKSIX_ZODIAC_NUMBERS: Record<string, number[]> = {
  rat: [6, 18, 30, 42],
  ox: [5, 17, 29, 41],
  tiger: [4, 16, 28, 40],
  rabbit: [3, 15, 27, 39],
  dragon: [2, 14, 26, 38],
  snake: [1, 13, 25, 37, 49],
  horse: [12, 24, 36, 48],
  goat: [11, 23, 35, 47],
  monkey: [10, 22, 34, 46],
  rooster: [9, 21, 33, 45],
  dog: [8, 20, 32, 44],
  pig: [7, 19, 31, 43],
}

export function marksixZodiacNumbers(code: string): number[] {
  return MARKSIX_ZODIAC_NUMBERS[code] ?? []
}
