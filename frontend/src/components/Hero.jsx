import { motion } from "framer-motion";

export default function Hero() {
  return (
    <header className="pt-20 sm:pt-28 pb-10 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <span className="label">Issue 01 · AI-assisted shopping</span>
        <span className="h-px flex-1 bg-ink-200" />
        <span className="label tabular-nums">2026</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mt-8 font-display text-[56px] leading-[0.95] sm:text-[88px] sm:leading-[0.92] text-ink-800"
      >
        Tell us what you{" "}
        <span className="italic text-forest-500">need</span>.
        <br />
        We'll bring back the{" "}
        <span className="italic text-coral-500">good stuff</span>.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-xl text-ink-500 text-base sm:text-lg leading-relaxed"
      >
        A small, opinionated shopping companion. It reads your sentence,
        searches the live web, and writes back a short, honest pick — with
        real links, no affiliate fluff.
      </motion.p>
    </header>
  );
}
