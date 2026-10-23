import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

import { safeRedirectPath } from '@/components/auth/AuthShell';
import { decryptSecret, encryptSecret, generateToken, hashToken, isEncrypted } from '@/lib/crypto';
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/password';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
});

describe('crypto', () => {
  it('cifra e decifra ida e volta', () => {
    const encrypted = encryptSecret('ckey_segredo');
    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted).not.toContain('ckey_segredo');
    expect(decryptSecret(encrypted)).toBe('ckey_segredo');
  });

  it('gera IV diferente a cada chamada', () => {
    expect(encryptSecret('a')).not.toBe(encryptSecret('a'));
  });

  it('rejeita payload adulterado (GCM autenticado)', () => {
    const [v, iv, tag, ct] = encryptSecret('valor').split(':');
    const tampered = Buffer.from(ct, 'base64');
    tampered[0] ^= 0xff;
    expect(() => decryptSecret([v, iv, tag, tampered.toString('base64')].join(':'))).toThrow();
  });

  it('texto puro legado não é considerado cifrado', () => {
    expect(isEncrypted('ckey_plain')).toBe(false);
  });

  it('token: só o hash é derivável e é determinístico', () => {
    const { token, tokenHash } = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(token)).toBe(tokenHash);
    expect(tokenHash).not.toBe(token);
  });
});

describe('password', () => {
  it('valida e rejeita a senha correta/incorreta', async () => {
    const hash = await hashPassword('uma-senha-bem-longa');
    expect(await verifyPassword('uma-senha-bem-longa', hash)).toBe(true);
    expect(await verifyPassword('outra-senha-qualquer', hash)).toBe(false);
  });

  it('usuário inexistente (sem hash) nunca autentica', async () => {
    expect(await verifyPassword('qualquer-coisa-12345', null)).toBe(false);
  });

  it('exige mínimo de 10 caracteres e máximo de 72 bytes', () => {
    expect(passwordSchema.safeParse('curta').success).toBe(false);
    expect(passwordSchema.safeParse('x'.repeat(10)).success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(73)).success).toBe(false);
  });
});

describe('safeRedirectPath', () => {
  it('aceita caminhos internos', () => {
    expect(safeRedirectPath('/tasks?x=1')).toBe('/tasks?x=1');
  });

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '', null, undefined])(
    'bloqueia open redirect: %s',
    (value) => {
      expect(safeRedirectPath(value as string | null | undefined)).toBe('/');
    }
  );
});
