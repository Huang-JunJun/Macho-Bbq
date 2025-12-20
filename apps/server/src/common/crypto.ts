import { createHmac, timingSafeEqual } from 'crypto';

export function signTable(storeId: string, tableId: string, secret: string) {
  return createHmac('sha256', secret).update(`${storeId}:${tableId}`).digest('hex');
}

export function verifyTableSign(storeId: string, tableId: string, secret: string, sign: string) {
  const expected = signTable(storeId, tableId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sign);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
