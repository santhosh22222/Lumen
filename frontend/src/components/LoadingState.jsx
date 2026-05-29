import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STAGES = [
  "Reading your sentence",
  "Understanding intent",
  "Searching the live web",
  "Reviewing real listings",
  "Writing the recommendation",
];

export default function LoadingState() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-12 grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-4">
        <div className="label">Working</div>
        <div className="mt-3 space-y-2">
          {STAGES.map((s, i) => {
            const active = i === stage;
            const done = i < stage;
            return (
              <motion.div
                key={s}
                animate={{ opacity: active ? 1 : done ? 0.6 : 0.35 }}
                className="flex items-center gap-3"
              >
                <span
                  className={`font-mono text-[11px] tabular-nums w-6 ${
                    active ? "text-coral-500" : "text-ink-400"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-sm ${
                    active ? "text-ink-800" : done ? "text-ink-500 line-through" : "text-ink-400"
                  }`}
                >
                  {s}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[16/10] shimmer" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-20 shimmer rounded" />
              <div className="h-4 w-full shimmer rounded" />
              <div className="h-4 w-2/3 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
