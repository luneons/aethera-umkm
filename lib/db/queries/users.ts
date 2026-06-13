import { execute, query, getDB, saveDB } from "../client";
import type { User, UserRole } from "../types";

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode("aethera-user:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getUsers(): Promise<User[]> {
  return query<User>("SELECT * FROM users ORDER BY role ASC, name ASC");
}

export async function getActiveUsers(): Promise<User[]> {
  return query<User>("SELECT * FROM users WHERE is_active = 1 ORDER BY role ASC, name ASC");
}

export async function getUserCount(): Promise<number> {
  const rows = await query<{ c: number }>("SELECT COUNT(*) AS c FROM users");
  return Number(rows[0]?.c ?? 0);
}

export async function createUser(input: {
  name: string;
  role: UserRole;
  pin: string;
}): Promise<number> {
  const hash = await hashPin(input.pin);
  return execute("INSERT INTO users (name, role, pin_hash) VALUES (?, ?, ?)", [
    input.name,
    input.role,
    hash,
  ]);
}

export async function updateUser(
  id: number,
  input: { name: string; role: UserRole; pin?: string }
): Promise<void> {
  if (input.pin) {
    const hash = await hashPin(input.pin);
    await execute("UPDATE users SET name = ?, role = ?, pin_hash = ? WHERE id = ?", [
      input.name,
      input.role,
      hash,
      id,
    ]);
  } else {
    await execute("UPDATE users SET name = ?, role = ? WHERE id = ?", [
      input.name,
      input.role,
      id,
    ]);
  }
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM users WHERE id = ?", [id]);
  await saveDB();
}

export async function verifyUserPin(id: number, pin: string): Promise<boolean> {
  const hash = await hashPin(pin);
  const rows = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE id = ? AND pin_hash = ?",
    [id, hash]
  );
  return Number(rows[0]?.c ?? 0) > 0;
}
