import { GAME_LABELS } from '@/constants/assets'
import { requireSupabase } from '@/lib/supabase'

export interface GameRuleSection {
  title: string
  items: string[]
}

export interface GameRuleContent {
  title: string
  sections: GameRuleSection[]
}

export async function fetchGameRules(code: string): Promise<GameRuleContent> {
  const client = requireSupabase()
  const label = GAME_LABELS[code] ?? code

  const { data: game } = await client
    .from('games')
    .select('id, name')
    .eq('code', code)
    .maybeSingle()

  if (!game) {
    return { title: label, sections: [{ title: 'กติกา', items: ['ไม่พบข้อมูลเกมในฐานข้อมูล'] }] }
  }

  const { data: rule, error } = await client
    .from('game_rules')
    .select('title, content')
    .eq('games_id', game.id)
    .eq('locale', 'th')
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (rule?.content) {
    try {
      const parsed = JSON.parse(rule.content) as GameRuleContent
      if (parsed.sections?.length) {
        return { ...parsed, title: rule.title ?? game.name ?? label }
      }
    } catch {
      /* plain text */
    }
    return {
      title: rule.title ?? game.name ?? label,
      sections: [{ title: 'กติกา', items: rule.content.split('\n').filter(Boolean) }],
    }
  }

  return {
    title: game.name ?? label,
    sections: [
      {
        title: 'กติกา',
        items: [`กติกา ${game.name} — กรุณาอัปเดตในตาราง game_rules`],
      },
    ],
  }
}
