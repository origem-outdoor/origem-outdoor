import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xmuwnbakycldyxudvefl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_grHnLnRVVGDS2Gcn_Dd5HA_dLIz7lU3'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
