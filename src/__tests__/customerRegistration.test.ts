import { describe, expect, it } from 'vitest';
import { formatCpf, formatPhone, isValidCpf, isValidPhone } from '@/lib/auth/customerRegistration';

describe('customer registration helpers', () => {
  it('formata e valida um CPF com dígitos verificadores corretos', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF repetido ou com dígito verificador inválido', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('formata e valida telefones brasileiros', () => {
    expect(formatPhone('27999998888')).toBe('(27) 99999-8888');
    expect(isValidPhone('(27) 99999-8888')).toBe(true);
    expect(isValidPhone('(00) 9999-8888')).toBe(false);
  });
});
