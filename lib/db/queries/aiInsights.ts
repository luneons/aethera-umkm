import { execute, query } from "../client";

export interface AiInsight {
  id: number;
  content: string;
  model: string | null;
  created_at: string;
}

export async function saveInsight(content: string, model: string): Promise<number> {
  return execute("INSERT INTO ai_insights (content, model) VALUES (?, ?)", [
    content,
    model,
  ]);
}

export async function getLatestInsight(): Promise<AiInsight | null> {
  const rows = await query<AiInsight>(
    "SELECT * FROM ai_insights ORDER BY id DESC LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function getInsightHistory(limit = 10): Promise<AiInsight[]> {
  return query<AiInsight>(
    "SELECT * FROM ai_insights ORDER BY id DESC LIMIT ?",
    [limit]
  );
}
