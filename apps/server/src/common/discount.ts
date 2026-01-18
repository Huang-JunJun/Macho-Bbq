export type SessionDiscountType = 'PERCENT' | 'AMOUNT';

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function calcDiscount(
  originalTotal: number,
  type: SessionDiscountType | null | undefined,
  value: number | null | undefined
) {
  const total = Math.max(0, Math.floor(originalTotal));
  if (!type || value === null || value === undefined) {
    return { discountAmount: 0, payableTotal: total };
  }

  if (type === 'PERCENT') {
    const rate = clampInt(Number(value), 1, 100);
    const discountAmount = Math.round((total * (100 - rate)) / 100);
    const applied = Math.min(discountAmount, total);
    return { discountAmount: applied, payableTotal: Math.max(total - applied, 0) };
  }

  const amount = Math.max(0, Math.floor(Number(value)));
  const applied = Math.min(amount, total);
  return { discountAmount: applied, payableTotal: Math.max(total - applied, 0) };
}
