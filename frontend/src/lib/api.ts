import axios, { AxiosError } from "axios";

/**
 * Browser → backend:
 * - Direct: NEXT_PUBLIC_API_URL=https://….up.railway.app (Railway public URL).
 * - On Vercel without that var: same-origin /api if BACKEND_URL is set (see next.config.ts rewrites).
 * - Explicit proxy: NEXT_PUBLIC_API_URL=same-origin + BACKEND_URL on Vercel.
 * OpenAI / NewsAPI keys belong only on Railway — never in NEXT_PUBLIC_*.
 */
function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  const onVercel = process.env.VERCEL === "1";
  if (explicit && explicit.toLowerCase() !== "same-origin") {
    return normalizeBase(explicit);
  }
  const useSameOrigin =
    explicit.toLowerCase() === "same-origin" || (!explicit && onVercel);

  if (useSameOrigin) {
    if (typeof window !== "undefined") {
      return "";
    }
    const internal = (
      process.env.BACKEND_URL ||
      process.env.RAILWAY_BACKEND_URL ||
      ""
    ).trim();
    if (internal) return normalizeBase(internal);
    return "http://localhost:8000";
  }

  if (typeof window !== "undefined") {
    return "http://localhost:8000";
  }
  const internal = (
    process.env.BACKEND_URL ||
    process.env.RAILWAY_BACKEND_URL ||
    ""
  ).trim();
  if (internal) return normalizeBase(internal);
  return "http://localhost:8000";
}

export const api = axios.create({
  baseURL: "",
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export interface AgentResponse {
  result: string;
  session_id: string;
  agent_type?: string;
}

export interface LiveNewsItem {
  title: string;
  summary: string;
  url: string;
  image_url?: string | null;
  source: string;
  time: string;
}

export interface LiveNewsResponse {
  result: string;
  items?: LiveNewsItem[];
  session_id: string;
  categories: string[];
  update_time: string;
  provider?: string;
}

export interface MultiAgentNewsResponse {
  results: Record<string, string>;
  session_id: string;
}

export interface UltimateNewsResponse {
  result: string;
  session_id: string;
  features: string[];
  language?: string;
  pdf_path?: string;
  voice_path?: string;
  voice_audio_language?: "en" | "ur";
  graph_path?: string;
  voice_error?: string;
}

function detailFromAxios(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ detail?: string }>;
    const d = ax.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
    return ax.message;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export async function runAgent(
  agentType: string,
  query: string,
  sessionId?: string
): Promise<AgentResponse> {
  try {
    const { data } = await api.post<AgentResponse>("/api/agent", {
      query,
      agent_type: agentType,
      session_id: sessionId,
    });
    return data;
  } catch (e) {
    throw new Error(detailFromAxios(e));
  }
}

export async function getMultiAgentNews(
  query: string,
  agents: string[],
  sessionId?: string
): Promise<MultiAgentNewsResponse> {
  try {
    const { data } = await api.post<MultiAgentNewsResponse>("/api/news", {
      query,
      agents,
      session_id: sessionId,
    });
    return data;
  } catch (e) {
    throw new Error(detailFromAxios(e));
  }
}

export async function getLiveNews(
  categories?: string[],
  sessionId?: string
): Promise<LiveNewsResponse> {
  try {
    const { data } = await api.post<LiveNewsResponse>("/api/live-news", {
      categories: categories?.length ? categories : ["all"],
      session_id: sessionId,
    });
    return data;
  } catch (e) {
    let msg = detailFromAxios(e);
    if (
      /Invalid OpenAI API key|Error running agent/i.test(msg) &&
      !/live_news.?rss/i.test(msg)
    ) {
      const base = getApiBaseUrl().replace(/\/$/, "") || window.location.origin;
      msg += ` Live News does not use OpenAI (RSS + optional NewsAPI only). This error usually means the app is hitting an old backend. Stop all uvicorn/python on port 8000, restart from the backend folder, then open ${base}/health — you should see "live_news":"rss".`;
    }
    throw new Error(msg);
  }
}

export async function postUltimateNews(body: {
  query: string;
  features: string[];
  language: string;
  session_id?: string;
}): Promise<UltimateNewsResponse> {
  try {
    const { data } = await api.post<UltimateNewsResponse>(
      "/api/ultimate-news",
      body
    );
    return data;
  } catch (e) {
    throw new Error(detailFromAxios(e));
  }
}

export function assetUrl(kind: "pdf" | "audio" | "graph", filename: string) {
  const base = normalizeBase(getApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : ""));
  const path =
    kind === "pdf"
      ? `/api/download-pdf/${encodeURIComponent(filename)}`
      : kind === "audio"
        ? `/api/download-audio/${encodeURIComponent(filename)}`
        : `/api/download-graph/${encodeURIComponent(filename)}`;
  return base ? `${base}${path}` : path;
}
