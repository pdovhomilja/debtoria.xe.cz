import bcrypt from "bcryptjs";

export async function hashPassword(password: string, cost = 12): Promise<string> {
  return bcrypt.hash(password, cost);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
