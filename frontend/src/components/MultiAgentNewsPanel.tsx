"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { getMultiAgentNews } from "@/lib/api";
import { useToast } from "./Toast";

const AGENT_OPTIONS = [
  { id: "seo", label: "SEO" },
  { id: "youtube", label: "YouTube" },
  { id: "forbes", label: "Forbes" },
  { id: "web_search", label: "Web Search" },
  { id: "news_research", label: "Research" },
  { id: "breaking_news_alert", label: "Breaking News" },
] as const;

export function MultiAgentNewsPanel() {
  const { showToast } = useToast();
  const [query, setQuery] = useState(
    "Latest AI regulation and model releases in the last week"
  );
  const [selected, setSelected] = useState<string[]>([
    "seo",
    "youtube",
    "forbes",
    "web_search",
    "news_research",
    "breaking_news_alert",
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => query.trim().length > 0 && selected.length > 0,
    [query, selected]
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await getMultiAgentNews(
        query.trim(),
        selected,
        sessionId || undefined
      );
      setSessionId(res.session_id);
      setResults(res.results);
      showToast("News query completed.", "success");
    } catch (e) {
      showToast((e as Error).message || "Request failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="multi-agent-news"
      className="relative py-16 border-t border-white/10 bg-[#05051a]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span className="text-xs uppercase tracking-widest text-white/50">
            SRS · Multi-Agent News Query
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Ask multiple agents at once
        </h2>
        <p className="text-white/60 max-w-2xl mb-8">
          Select agents, enter a query, and the run to return a combined digest.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-strong border border-white/10 rounded-xl p-4">
              <div className="text-sm text-white/70 mb-3">Agents</div>
              <div className="grid grid-cols-2 gap-2">
                {AGENT_OPTIONS.map((a) => {
                  const on = selected.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.id)}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                        on
                          ? "border-cyan-500/60 bg-cyan-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-strong border border-white/10 rounded-xl p-4">
              <label className="text-sm text-white/70 mb-2 block">Query</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={submit}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Run selected agents
              </button>
              {sessionId ? (
                <p className="mt-2 text-[11px] text-white/40 break-all">
                  session_id: {sessionId}
                </p>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="glass-strong border border-white/10 rounded-xl p-4 min-h-[420px]">
              <div className="text-sm text-white/70 mb-3">Results</div>
              {!results && !loading ? (
                <div className="text-white/40 text-sm">
                  Results will appear here after you submit.
                </div>
              ) : null}
              {loading ? (
                <div className="flex items-center gap-3 text-white/70 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running agents… this can take a bit.
                </div>
              ) : null}
              {results ? (
                <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                  {Object.entries(results).map(([agent, text]) => (
                    <motion.div
                      key={agent}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-white/10 bg-black/20 p-4"
                    >
                      <div className="text-xs uppercase tracking-wide text-cyan-300/80 mb-2">
                        {agent}
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-white/85 font-sans">
                        {text}
                      </pre>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
