"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Download, Loader2, Wand2 } from "lucide-react";
import {
  assetUrl,
  postUltimateNews,
  type UltimateNewsResponse,
} from "@/lib/api";
import { useToast } from "./Toast";

const FEATURES = [
  { id: "daily_collection", label: "Daily collection" },
  { id: "summaries", label: "Summaries" },
  { id: "trends", label: "Trends (text)" },
  { id: "trend_graph", label: "Trend graph (PNG)" },
  { id: "pdf_report", label: "PDF report" },
  { id: "voice_summary", label: "Voice summary (MP3)" },
] as const;

export function UltimateNewsPanel() {
  const { showToast } = useToast();
  const [query, setQuery] = useState(
    "Give me a comprehensive AI industry digest for today."
  );
  const [language, setLanguage] = useState<"english" | "urdu" | "bilingual">(
    "english"
  );
  const [features, setFeatures] = useState<string[]>([
    "daily_collection",
    "summaries",
    "trends",
  ]);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<UltimateNewsResponse | null>(null);

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const run = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setPayload(null);
    try {
      const res = await postUltimateNews({
        query: query.trim(),
        features,
        language,
      });
      setPayload(res);
      showToast("Ultimate news run completed.", "success");
    } catch (e) {
      showToast((e as Error).message || "Request failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-16 border-t border-white/10 bg-[#030014]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-5 h-5 text-purple-300" />
          <span className="text-xs uppercase tracking-widest text-white/50">
            SRS · Ultimate Agent + Downloads
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Ultimate AI News (PDF / Audio / Graph)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-strong border border-white/10 rounded-xl p-4">
              <label className="text-sm text-white/70 mb-2 block">Language</label>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as typeof language)
                }
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              >
                <option value="english">English</option>
                <option value="urdu">Urdu</option>
                <option value="bilingual">Bilingual</option>
              </select>
            </div>

            <div className="glass-strong border border-white/10 rounded-xl p-4">
              <div className="text-sm text-white/70 mb-3">Features</div>
              <div className="space-y-2">
                {FEATURES.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 text-sm text-white/80"
                  >
                    <input
                      type="checkbox"
                      checked={features.includes(f.id)}
                      onChange={() => toggleFeature(f.id)}
                      className="rounded border-white/20 bg-black/30"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="glass-strong border border-white/10 rounded-xl p-4">
              <label className="text-sm text-white/70 mb-2 block">Query</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
              />
              <button
                type="button"
                disabled={loading || !query.trim()}
                onClick={run}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Run ultimate agent
              </button>
            </div>

            {payload ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong border border-white/10 rounded-xl p-4"
              >
                <div className="text-sm text-white/70 mb-3">Output</div>
                <pre className="whitespace-pre-wrap text-sm text-white/85 font-sans max-h-[360px] overflow-y-auto mb-4">
                  {payload.result}
                </pre>

                <div className="flex flex-wrap gap-3">
                  {payload.pdf_path ? (
                    <a
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/15 hover:border-white/30"
                      href={assetUrl("pdf", payload.pdf_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </a>
                  ) : null}
                  {payload.voice_path ? (
                    <a
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/15 hover:border-white/30"
                      href={assetUrl("audio", payload.voice_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      Download MP3
                    </a>
                  ) : null}
                  {payload.graph_path ? (
                    <a
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/15 hover:border-white/30"
                      href={assetUrl("graph", payload.graph_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      Download graph
                    </a>
                  ) : null}
                </div>

                {payload.voice_path && payload.voice_audio_language ? (
                  <p className="mt-2 text-xs text-white/50">
                    Audio track language:{" "}
                    {payload.voice_audio_language === "ur" ? "Urdu" : "English"}
                    {payload.language === "bilingual"
                      ? " (SRS: English digest + Urdu audio)"
                      : ""}
                  </p>
                ) : null}
                {payload.voice_error ? (
                  <p className="mt-3 text-sm text-amber-300/90">
                    Voice note: {payload.voice_error}
                  </p>
                ) : null}
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
