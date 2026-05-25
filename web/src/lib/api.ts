import type { PropertyInput, PredictionResponse, RecommendationsResponse } from "@/types/epc";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 30_000;

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const err = await res.json();
        if (typeof err?.detail === "string") detail = err.detail;
      } catch {
        // response wasn't JSON (e.g. nginx error page) — use status text
      }
      throw new Error(detail);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function predictEpc(input: PropertyInput): Promise<PredictionResponse> {
  return post<PredictionResponse>("/api/predict", input);
}

export function getRecommendations(input: PropertyInput): Promise<RecommendationsResponse> {
  return post<RecommendationsResponse>("/api/recommendations", input);
}
