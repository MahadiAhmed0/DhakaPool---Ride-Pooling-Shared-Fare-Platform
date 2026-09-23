// Converts money between the database (BigInt paisa) and the rest of the code (number paisa).
// Every realistic amount is far below Number.MAX_SAFE_INTEGER, so the conversion is exact (ERD §3).

export function paisaFromDb(value: bigint): number {
  const paisa = Number(value);
  if (!Number.isSafeInteger(paisa)) {
    throw new Error(`Amount ${value} paisa is too large to handle safely.`);
  }
  return paisa;
}

export function paisaToDb(paisa: number): bigint {
  if (!Number.isSafeInteger(paisa)) {
    throw new Error(`Amount ${paisa} is not a whole number of paisa.`);
  }
  return BigInt(paisa);
}
