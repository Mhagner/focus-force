import bcrypt from 'bcryptjs';
import { z } from 'zod';

const COST = 12;

// bcrypt só considera os primeiros 72 bytes; limitamos para não truncar em silêncio.
export const passwordSchema = z
  .string()
  .min(10, 'A senha deve ter pelo menos 10 caracteres.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'A senha é longa demais (máx. 72 bytes).');

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

// Hash descartável para equalizar o tempo de resposta quando o usuário não existe.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', COST);

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const valid = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && valid;
}
