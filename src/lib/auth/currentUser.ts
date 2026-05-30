import { createClient } from '@/utils/supabase/client';

export type CurrentUser = {
  id: string;
  email?: string;
  name: string;
  phone: string;
  birthDate: string;
};

function toCurrentUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, string | undefined>;
}): CurrentUser {
  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email,
    name: metadata.nome_completo || user.email?.split('@')[0] || '',
    phone: metadata.telefone || '',
    birthDate: metadata.data_nascimento || '',
  };
}

export async function getCurrentUserFast(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return toCurrentUser(session.user);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return toCurrentUser(user);
}
