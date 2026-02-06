const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function fetchPointInsight(longitude: number, latitude: number) {
  const res = await fetch(`${BACKEND_URL}/insight/point`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longitude, latitude }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchRegionInsight(params: { bbox?: number[]; feature_id?: string }) {
  const res = await fetch(`${BACKEND_URL}/insight/region`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFindExtreme(params: {
  metric: string;
  mode?: "max" | "min";
  top_n?: number;
}) {
  const rawTopN = params.top_n ?? 1;
  const top_n = Math.max(1, Math.min(20, Math.round(Number(rawTopN) || 1)));
  const res = await fetch(`${BACKEND_URL}/insight/find`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metric: params.metric,
      mode: params.mode ?? "max",
      top_n,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
