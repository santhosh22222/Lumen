import { motion } from "framer-motion";
import { ArrowUpRight, Check, Plus } from "lucide-react";

function FallbackThumb({ source }) {
  const letter = (source || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-full h-full bg-ink-100 flex items-center justify-center">
      <span className="font-display italic text-7xl text-ink-300">{letter}</span>
    </div>
  );
}

function MatchBar({ score }) {
  const pct = Math.max(0, Math.min(100, Math.round((score || 0) * 100)));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-ink-200 overflow-hidden">
        <div
          className="h-full bg-forest-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-ink-500 tabular-nums">{pct}%</span>
    </div>
  );
}

export default function ProductCard({ rec, index, selected, onToggleCompare }) {
  const { title, url, source, snippet, price, image, score, reason } = rec;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="card shadow-soft hover:shadow-lift transition overflow-hidden flex flex-col"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-[16/10] relative overflow-hidden bg-ink-100 group"
      >
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <FallbackThumb source={source} />
        )}

        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5">
          <span className="font-mono text-[11px] tabular-nums px-2 py-0.5 bg-paper-50/95 border border-ink-200 rounded-full text-ink-700">
            {String(index + 1).padStart(2, "0")}
          </span>
          {price && (
            <span className="text-[11px] px-2 py-0.5 bg-ink-800 text-paper-50 rounded-full">
              {price}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleCompare();
          }}
          title={selected ? "Remove from compare" : "Add to compare"}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center border transition ${
            selected
              ? "bg-forest-500 border-forest-500 text-paper-50"
              : "bg-paper-50/95 border-ink-200 text-ink-600 hover:text-ink-900"
          }`}
        >
          {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </a>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="label truncate">{source || "web"}</span>
        </div>
        <h3 className="font-display text-[22px] leading-[1.15] text-ink-800 line-clamp-2">
          {title}
        </h3>
        {reason ? (
          <p className="text-[14.5px] text-ink-600 leading-[1.6] line-clamp-3">
            <span className="italic text-forest-600">Why this. </span>
            {reason}
          </p>
        ) : (
          <p className="text-sm text-ink-500 leading-[1.6] line-clamp-3">{snippet}</p>
        )}

        <MatchBar score={score} />

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-ink-200/70">
          <span className="label">Listing</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-800 hover:text-forest-600"
          >
            Open <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
