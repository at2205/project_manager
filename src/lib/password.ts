import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);

// A throw-away hash so that logging in with an unknown email costs the same time as a wrong password
// (prevents account enumeration through response timing).
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= bcrypt.hash("not-a-real-password", BCRYPT_COST));

/** Constant-work password check. `hash` is null when the user does not exist. */
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(plain, hash || (await dummyHash()));
  return !!hash && ok;
}
