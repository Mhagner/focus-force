import { createHash, randomInt } from 'crypto';

export const MAGIC_LINK_CODE_LENGTH = 6;
export const MAGIC_LINK_EXPIRATION_MINUTES = 10;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateVerificationCode() {
  const min = 10 ** (MAGIC_LINK_CODE_LENGTH - 1);
  const max = 10 ** MAGIC_LINK_CODE_LENGTH;
  const code = randomInt(min, max);
  return String(code);
}

export function hashVerificationCode(email: string, code: string) {
  return createHash('sha256').update(`${normalizeEmail(email)}:${code}`).digest('hex');
}
