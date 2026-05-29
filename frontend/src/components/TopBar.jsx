import { Cpu, Globe, History, Layers } from "lucide-react";

export default function TopBar({ providers, history, onPickHistory, compareCount, onOpenCompare }) {
  return (
    <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 backdrop-blur bg-paper-50/80 border-b border-ink-200/60">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl italic text-ink-800 leading-none">Lumen</span>
          <span className="hidden sm:inline label ml-2">a shopping reader</span>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {providers?.llm && (
            <span className="hidden md:inline-flex items-center gap-1.5 chip" title="LLM provider">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">
                {providers.llm}
                {providers.llm_model ? `/${providers.llm_model.split("/").pop()}` : ""}
              </span>
            </span>
          )}
          {providers?.search && (
            <span className="hidden md:inline-flex items-center gap-1.5 chip" title="Search provider">
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">{providers.search}</span>
            </span>
          )}

          <HistoryButton history={history} onPick={onPickHistory} />

          <button
            onClick={onOpenCompare}
            disabled={!compareCount}
            className="btn-ghost relative disabled:opacity-40 disabled:cursor-not-allowed"
            title="Compare picks"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Compare</span>
            {compareCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-paper-50 text-[10px] font-medium">
                {compareCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryButton({ history, onPick }) {
  if (!history?.length) return null;
  return (
    <details className="relative group">
      <summary className="btn-ghost list-none cursor-pointer select-none">
        <History className="w-4 h-4" />
        <span className="hidden sm:inline">Recent</span>
      </summary>
      <div className="absolute right-0 mt-2 w-80 card shadow-soft p-2 origin-top-right">
        <div className="px-3 py-2 label">Recent searches</div>
        <ul className="max-h-72 overflow-auto">
          {history.map((q) => (
            <li key={q}>
              <button
                onClick={() => onPick(q)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-ink-100 text-sm text-ink-700"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
