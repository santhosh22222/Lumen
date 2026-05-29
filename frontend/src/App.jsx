import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import TopBar from "./components/TopBar.jsx";
import Hero from "./components/Hero.jsx";
import SearchBar from "./components/SearchBar.jsx";
import ExampleChips from "./components/ExampleChips.jsx";
import LoadingState from "./components/LoadingState.jsx";
import SummaryPanel from "./components/SummaryPanel.jsx";
import ResultsGrid from "./components/ResultsGrid.jsx";
import RefineBar from "./components/RefineBar.jsx";
import CompareDrawer from "./components/CompareDrawer.jsx";
import { recommend, getHealth } from "./api.js";

const HISTORY_KEY = "lumen.history.v1";
const MAX_HISTORY = 8;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function ConfigWarning({ health }) {
  if (!health) return null;
  const missing = [];
  if (!health.llm_provider) missing.push("an LLM key (GROQ / OPENAI / GEMINI / ANTHROPIC)");
  if (!health.search_provider) missing.push("a search key (TAVILY or SERPAPI)");
  if (!missing.length) return null;
  return (
    <div className="card border-coral-400/50 bg-coral-400/10 p-4 sm:p-5 flex items-start gap-3 max-w-3xl">
      <AlertTriangle className="w-5 h-5 text-coral-600 mt-0.5 shrink-0" />
      <div className="text-sm text-ink-700">
        Backend is missing <strong>{missing.join(" and ")}</strong>. Add to{" "}
        <code className="font-mono text-coral-700">backend/.env</code> and restart.
      </div>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [history, setHistory] = useState(loadHistory);
  const [compare, setCompare] = useState([]); // array of recs
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const compareSet = useMemo(
    () => new Set(compare.map((c) => c.url)),
    [compare]
  );

  const pushHistory = (q) => {
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY);
      return next;
    });
  };

  const runQuery = async (payload) => {
    setLoading(true);
    setError(null);
    setData(null);
    setQuery(payload.query);
    try {
      const res = await recommend(payload);
      setData(res);
      pushHistory(payload.query);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onRefine = (instruction) => {
    if (!query) return;
    const refined = `${query}. Refine: ${instruction}`;
    runQuery({ query: refined, top_k: 6 });
  };

  const toggleCompare = (rec) => {
    setCompare((prev) => {
      const exists = prev.find((r) => r.url === rec.url);
      if (exists) return prev.filter((r) => r.url !== rec.url);
      return [...prev, rec].slice(0, 6);
    });
  };

  const clearCompare = () => setCompare([]);

  return (
    <div className="min-h-full">
      <TopBar
        providers={data?.providers || null}
        history={history}
        onPickHistory={(q) => {
          setQuery(q);
          runQuery({ query: q, top_k: 6 });
        }}
        compareCount={compare.length}
        onOpenCompare={() => setDrawerOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Hero />

        <div className="mt-2">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={runQuery}
            loading={loading}
          />
          <ExampleChips
            disabled={loading}
            onPick={(q) => {
              setQuery(q);
              runQuery({ query: q, top_k: 6 });
            }}
          />
        </div>

        <main className="mt-12 pb-24">
          <ConfigWarning health={health} />

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingState />
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card border-coral-400/50 bg-coral-400/10 p-5 max-w-3xl flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-coral-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-ink-800">
                    Couldn't fetch recommendations
                  </div>
                  <div className="text-sm text-ink-600 mt-1">{error}</div>
                </div>
              </motion.div>
            )}

            {!loading && data && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <SummaryPanel
                  query={data.query}
                  summary={data.summary}
                  intent={data.intent}
                />
                {data.results?.length ? (
                  <>
                    <ResultsGrid
                      results={data.results}
                      compareSet={compareSet}
                      onToggleCompare={toggleCompare}
                    />
                    <RefineBar onRefine={onRefine} disabled={loading} />
                  </>
                ) : (
                  <div className="card p-6 text-center text-ink-500 max-w-3xl">
                    No live results found. Try rephrasing or relaxing the constraints.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="pb-12 border-t border-ink-200 pt-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-ink-400">
          <span className="font-display italic text-base text-ink-600">Lumen</span>
          <span>Live web search · Real listings · No affiliate noise</span>
        </footer>
      </div>

      <CompareDrawer
        open={drawerOpen}
        items={compare}
        query={data?.query || query}
        health={health}
        onClose={() => setDrawerOpen(false)}
        onRemove={(it) => toggleCompare(it)}
        onClear={clearCompare}
      />
    </div>
  );
}
