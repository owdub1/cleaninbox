import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables:', {
    url: supabaseUrl ? 'SET' : 'MISSING',
    key: supabaseAnonKey ? 'SET' : 'MISSING'
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file and Vercel environment variables.')
}

if (typeof supabaseUrl !== 'string' || typeof supabaseAnonKey !== 'string') {
  console.error('Invalid environment variable types:', {
    urlType: typeof supabaseUrl,
    keyType: typeof supabaseAnonKey
  });
  throw new Error('Supabase environment variables must be strings')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
