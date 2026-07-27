export type CurrentUser = {
  id: string;
  email?: string;
  name: string;
  phone: string;
  birthDate: string;
};

export function toCurrentUser(user: {
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
