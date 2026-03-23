'use client'

import { createClient } from '@/lib/supabase/client'

export async function ensureAnonymousSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await ensurePublicUser(supabase, user.id)
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  await supabase.auth.signOut()
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error

  if (data.user) {
    await ensurePublicUser(supabase, data.user.id)
  }

  return data.session
}

async function ensurePublicUser(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!data) {
    await supabase
      .from('users')
      .insert({ id: userId })
  }
}
