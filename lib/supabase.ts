import { createClient } from '@supabase/supabase-js'

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yhuznhpefoicrxisoojd.supabase.co'

const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_dz_oT_mT8kXpCMHpkdmf3Q_2VfCl7TU'

export const supabase = createClient(url, key)
