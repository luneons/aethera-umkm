"use client";

import { getSetting } from "@/lib/db/queries/settings";

export const OPENROUTER_KEY_SETTING = "openrouter_api_key";
export const OPENROUTER_MODEL_SETTING = "openrouter_model";

export const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export const AVAILABLE_MODELS = [
  { value: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 120B (gratis ⭐)" },
  { value: "deepseek/deepseek-chat:free", label: "DeepSeek Chat (gratis)" },
  { value: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick (gratis)" },
  { value: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (gratis)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (berbayar)" },
  { value: "openai/gpt-4o", label: "GPT-4o (berbayar)" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (berbayar)" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5 (berbayar)" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (berbayar)" },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call the OpenRouter chat completions API directly from the browser.
 * The API key is provided by the user and stored locally in SQLite.
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  opts: { model?: string; signal?: AbortSignal } = {}
): Promise<string> {
  const apiKey = await getSetting(OPENROUTER_KEY_SETTING);
  if (!apiKey) {
    throw new Error(
      "API key OpenRouter belum diatur. Buka Pengaturan untuk menambahkannya."
    );
  }
  const model = opts.model || (await getSetting(OPENROUTER_MODEL_SETTING)) || DEFAULT_MODEL;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://aethera.app",
      "X-Title": "AETHERA UMKM",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 700,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err?.error?.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Gagal memanggil OpenRouter: ${detail}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Respon AI kosong");
  return content.trim();
}

/** Test that an API key is valid by making a tiny request. */
export async function testOpenRouterKey(apiKey: string): Promise<boolean> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.ok;
}
