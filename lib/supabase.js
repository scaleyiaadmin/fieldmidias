import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
