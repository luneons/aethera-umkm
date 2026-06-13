import { execute, query, saveDB, getDB } from "../client";
import type { Category, CategoryType } from "../types";

export async function getCategories(type?: CategoryType): Promise<Category[]> {
  if (type) {
    return query<Category>(
      `SELECT * FROM categories
       WHERE is_active = 1 AND (type = ? OR type = 'both')
       ORDER BY name ASC`,
      [type]
    );
  }
  return query<Category>(
    "SELECT * FROM categories ORDER BY type ASC, name ASC"
  );
}

export async function createCategory(input: {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}): Promise<number> {
  return execute(
    "INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)",
    [input.name, input.type, input.color ?? "#F5A623", input.icon ?? null]
  );
}

export async function updateCategory(
  id: number,
  input: { name: string; type: CategoryType; color?: string }
): Promise<void> {
  await execute(
    "UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?",
    [input.name, input.type, input.color ?? "#F5A623", id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM categories WHERE id = ?", [id]);
  await saveDB();
}
