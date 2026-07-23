import bcrypt from "bcryptjs";

const PIN_PATTERN = /^\d{4}$/;
const BCRYPT_ROUNDS = 10;

export function isValidPinFormat(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export async function hashOperatorPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyOperatorPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/** 반복(0000, 1111...) 또는 연속(0123, 1234...) 숫자 — 저장은 허용하되 경고만 띄운다. */
export function isWeakPin(pin: string): boolean {
  if (!isValidPinFormat(pin)) return false;
  if (/^(\d)\1{3}$/.test(pin)) return true;

  const digits = pin.split("").map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return ascending || descending;
}
