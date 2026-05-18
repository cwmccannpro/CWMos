import { createAuthClient } from '@/lib/supabase/server';

type Credentials = Record<string, unknown>;

export async function getUserCredentials(provider: string): Promise<{
  userId: string | null;
  credentials: Credentials | null;
}> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, credentials: null };

  const { data } = await supabase
    .from('user_integrations')
    .select('credentials, enabled')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single();

  return {
    userId: user.id,
    credentials: (data?.enabled && data?.credentials) ? data.credentials as Credentials : null,
  };
}
