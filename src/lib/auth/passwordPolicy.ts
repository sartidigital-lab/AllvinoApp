const SPECIAL_PASSWORD_CHARACTERS = "!@#$%^&*()_+-=[]{};':\"\\|<>?,./`~";

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (!/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.';
  }

  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um número.';
  }

  if (![...password].some((character) => SPECIAL_PASSWORD_CHARACTERS.includes(character))) {
    return 'A senha deve conter pelo menos um símbolo, como !, @, # ou $.';
  }

  return null;
}
