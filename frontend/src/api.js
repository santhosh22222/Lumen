const BASE = ""; // proxied via Vite to backend

export async function getHealth() {
  const r = await fetch(`${BASE}/api/health`);
  if (!r.ok) throw new Error("Health check failed");
  return r.json();
}

export async function recommend({ query, top_k = 6, max_price, region }) {
  const r = await fetch(`${BASE}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k, max_price, region }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.detail || `Request failed (${r.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function compare({ query, items, deep = false }) {
  const r = await fetch(`${BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      deep,
      items: items.map((it) => ({
        title: it.title,
        url: it.url,
        source: it.source,
        snippet: it.snippet,
        price: it.price,
        image: it.image,
        reason: it.reason,
      })),
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.detail || `Compare failed (${r.status})`;
    throw new Error(msg);
  }
  return data;
}
