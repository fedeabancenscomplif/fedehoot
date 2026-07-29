import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[startup] WARNING: SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key, writes may fail');
}

// Service role key for server-side DB operations (bypasses RLS, never exposed to client)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
);

// Separate anon-key client only for JWT verification
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getUserFromRequest(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export { supabase, randomUUID, getUserFromRequest };
