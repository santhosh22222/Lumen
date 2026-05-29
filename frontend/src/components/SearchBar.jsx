import { useState } from "react";
import { ArrowRight, Loader2, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchBar({ onSubmit, loading, value, onChange }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [topK, setTopK] = useState(6);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!value.trim() || loading) return;
    onSubmit({
      query: value.trim(),
      top_k: Number(topK) || 6,
      max_price: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="w-full max-w-3xl">
      <div className="card shadow-soft px-2 sm:px-3 py-2 flex items-center gap-2">
        <span className="hidden sm:flex items-center justify-center w-9 h-9 font-mono text-[11px] text-ink-400">
          01
        </span>
        <span className="hidden sm:block w-px h-6 bg-ink-200" />
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="A quiet pair of headphones for long flights, under $250…"
          className="flex-1 bg-transparent outline-none py-3 text-ink-800 placeholder:text-ink-300 text-[15px]"
        />
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="hidden sm:inline-flex btn-ghost"
          title="Refine"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Options</span>
        </button>
        <button type="submit" disabled={loading || !value.trim()} className="btn-primary">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading
            </>
          ) : (
            <>
              Recommend
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 card px-4 py-3 flex flex-wrap items-center gap-5 text-sm">
              <label className="flex items-center gap-2">
                <span className="label">Max price</span>
                <input
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="any"
                  className="w-24 bg-paper-100 rounded-md px-2 py-1 outline-none border border-ink-200/70 focus:border-ink-400"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="label">Results</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  className="w-16 bg-paper-100 rounded-md px-2 py-1 outline-none border border-ink-200/70 focus:border-ink-400"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setMaxPrice("");
                  setTopK(6);
                }}
                className="ml-auto btn-ghost"
              >
                <X className="w-3.5 h-3.5" /> reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
