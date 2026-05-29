import { useState } from "react";
import { Wand2, ArrowRight } from "lucide-react";

const QUICK = [
  { label: "Cheaper", refine: "cheaper options" },
  { label: "Higher rated", refine: "higher rated and more reviewed" },
  { label: "Premium", refine: "premium / flagship picks" },
  { label: "Travel-friendly", refine: "lighter and more travel friendly" },
];

export default function RefineBar({ onRefine, disabled }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e?.preventDefault?.();
    if (!text.trim()) return;
    onRefine(text.trim());
    setText("");
  };

  return (
    <section className="my-10 card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-coral-500" />
        <span className="label">Refine</span>
      </div>
      <p className="mt-2 text-ink-600 text-sm">
        Not quite right? Nudge the search.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.label}
            disabled={disabled}
            onClick={() => onRefine(q.refine)}
            className="chip disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. lighter, with longer battery, ideally Sony or Bose"
          className="flex-1 bg-paper-100 rounded-full px-4 py-2.5 outline-none border border-ink-200/70 focus:border-ink-400 text-sm"
        />
        <button type="submit" disabled={disabled || !text.trim()} className="btn-primary">
          Refine <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
}
