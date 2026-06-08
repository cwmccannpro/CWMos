import { createAuthClient, createServerClient } from '@/lib/supabase/server';

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

// Service-role lookup — no session required. Used for internal server-to-server calls
// (e.g. Master Controller) where no browser session is present.
export async function getServiceCredentials(provider: string): Promise<{
  userId: string | null;
  credentials: Credentials | null;
}> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('user_integrations')
    .select('user_id, credentials, enabled')
    .eq('provider', provider)
    .eq('enabled', true)
    .limit(1)
    .single();

  if (error || !data) return { userId: null, credentials: null };
  return {
    userId: data.user_id as string,
    credentials: data.credentials ? data.credentials as Credentials : null,
  };
}
