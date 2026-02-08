# EarthLink AI

<p align="center">
  <img src="https://img.shields.io/badge/Tambo%20AI-Agentic%20Tools%20%2B%20Living%20UI-6366f1?style=for-the-badge" alt="Tambo AI" />
  <img src="https://img.shields.io/badge/Google%20Earth%20Engine-Sentinel--2%20Level--2A-4285F4?style=for-the-badge" alt="GEE + Sentinel-2" />
  <img src="https://img.shields.io/badge/Next.js-16-000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Mapbox-Maps-000?style=for-the-badge&logo=mapbox" alt="Mapbox" />
</p>

<p align="center">
  <strong>🛰️ Satellite-grade environmental intelligence. No code. No PhD.</strong><br />
  <em>Ask in plain language — get answers on the map.</em>
</p>

```
    · · ·  ○  · · ·      orbit
  ·     ╱   ╲     ·     Sentinel-2 → your prompt
 ·    ╱  🌍  ╲    ·     EarthLink AI
  ·   ╲     ╱   ·       map + insights
    · · ·  ○  · · ·
```

---

## 🌍 The problem

[Google Earth Engine](https://earthengine.google.com/) and satellite imagery have made planet-scale environmental data available—but **using it is deeply technical**. You deal with image collections, cloud masking, band math, temporal aggregation, and spatial joins. Deriving indices like NDVI, LST, or built-up intensity from raw [Sentinel-2](https://developers.google.com/earth-engine/datasets/catalog/sentinel-2) bands requires knowing band names, scaling, and formulas. Querying "greenest" or "coolest" areas means filtering, reducing, and joining geometries. **That complexity has kept this data in the hands of experts.** EarthLink AI makes that same data answerable in plain language on a map.

**Data source:** This project uses **[Harmonized Sentinel-2 MSI: MultiSpectral Instrument, Level-2A (SR)](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED)** — atmospherically corrected surface reflectance at 10–60 m resolution, with a harmonized time series so analyses stay consistent across processing baselines. The insights you see (vegetation, temperature, greenness) are derived from this dataset; EarthLink AI exposes them through natural language instead of code.

---

## ⚡ Powered by **Tambo AI**

EarthLink AI is built so the **agentic loop is the product**. The judge isn't a search box; it's an AI that **decides which tools to call, in what order**, and keeps map and sidebar in sync. That's why we built on **[Tambo AI](https://tambo.ai)**.

### Agentic tools (Tambo `defineTool`)

The LLM doesn't "answer and suggest"—it **acts**. All of these are Tambo tools the model can call in one turn or chain across several:

| Tool | Purpose |
|------|--------|
| `search_places` | Fly to a place (e.g. "Mission District") |
| `analyze_proximity` | Find areas within a radius (e.g. "green options within 2 miles") — **plots on map automatically** |
| `find_extreme` | Top N by metric (warmest, coolest, greenest), with optional **append** for "3 hottest + 3 greenest" |
| `compare_locations` | Side-by-side metrics in the sidebar (LST, Green Score, NDVI, etc.), with optional `metricsToShow` |
| `label_areas` | Name regions on the map (with **labelOnlyFirst: 3** so only the top 3 get labels) |
| `get_place_name` | Reverse geocode for neighborhood names |
| `filter_map_view` | Visual filter (e.g. "NDVI > 0.5", "BSI > 0.1") |
| `visualize_heatmap` | Heat or greenness layer |
| `show_on_map` | Highlight one or more locations when explicitly asked |
| `get_insight_at_point` / `get_insight_for_region` | Metrics at a click or drawn region |
| `navigate_map`, `toggle_map_layer`, `analyze_temporal_trends` | Map control and trends |

**14 tools** in total. The model chooses which to call and with what arguments (e.g. `append: true`, `labelOnlyFirst: 3`, `metricsToShow: ['NDVI']`). No fixed "click here then there" flow—**one prompt can trigger search → proximity → compare → label** in a single response.

### Living UI (Tambo components)

Sidebar content isn't static. We register **6 Tambo components** so the model can render the right view for the answer:

- **InsightCard** — Single-location summary (title, metrics, summary)
- **MetricsTable** — Tables and charts (bar, radar, line) for one or many locations
- **KeyTakeaways** — Bullet takeaways
- **RegionSummaryCard** — Region-level aggregates
- **ComparisonTable** — Multi-location comparison (used after `compare_locations`)
- **GrowthChart** — Temporal trends (used with `analyze_temporal_trends`)

The same chat turn that calls `compare_locations` can push a **ComparisonTable** into the sidebar. No separate "click to see comparison"—**Tambo ties tool output to UI**.

### Why this wins for a Tambo hackathon

- **Tambo is the brain.** Tools + components are the only way the map and sidebar get updated; the LLM doesn't "describe" the map, it **calls tools** and **renders components**.
- **Multi-step, stateful flows.** Proximity → compare → label, or find_extreme (twice with `append`) → compare, with refs so the same turn doesn't lose state.
- **Real product behavior.** Land-only vs water, "label only top 3", filter vs heatmap, no redundant "re-plot"—all encoded in tool contracts and system prompt so the agent behaves like a shipped feature.

---

## 🛰️ Data under the hood

Insights are driven by **Harmonized Sentinel-2 MSI Level-2A (SR)** — the same [dataset](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED) in Google Earth Engine: atmospherically corrected surface reflectance, 13 spectral bands (visible/NIR at 10 m, red edge/SWIR at 20 m). NDVI, green score, heat score, and related metrics are derived from this source. The pipeline is built for [Google Earth Engine](https://earthengine.google.com/); for the MVP we use precomputed GeoJSON (e.g. San Francisco) so the **agent experience** is what we're judged on—same tools and prompts will plug into live GEE when we scale.

- **Coverage:** The app currently covers the **San Francisco area** only, because our precomputed data is limited to this region.

---

## 🧰 Tech stack

| Layer | Tech |
|-------|------|
| **Agent & UI** | [Tambo AI](https://tambo.ai) (React) — tools + Living components |
| **LLM** | Google Gemini (Vercel AI SDK / `@ai-sdk/google`) |
| **Frontend** | Next.js 16, Mapbox GL (react-map-gl), Recharts |
| **Backend** | FastAPI, GeoJSON, geometry helpers |
| **Data** | Harmonized Sentinel-2 Level-2A (SR); GeoJSON for MVP; design for Earth Engine |

---

## 🚀 Getting started

**Prerequisites:** Node.js, Python 3.10+, [Mapbox](https://www.mapbox.com/) API key, Google Gemini API key, [Tambo](https://tambo.ai) API key.

**1. Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs at `http://localhost:8000`.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`.

**3. Environment** (`frontend/.env.local`)

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.***
GOOGLE_GENERATIVE_AI_API_KEY=***
NEXT_PUBLIC_TAMBO_API_KEY=***
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**4. Use it**

Open the app and ask in natural language. The map and sidebar update from Tambo tool and component calls.

---

## 🏆 Built for the Tambo AI Hackathon

EarthLink AI is built to show that **geospatial intelligence doesn't have to live in terminals and notebooks**. Tambo's agentic tools and Living UI let one prompt drive search, proximity, comparison, labeling, and filters—so the same data that used to require experts can be **used by everyone, in their own words**.

---

*Data from [Harmonized Sentinel-2 MSI Level-2A (SR)](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED) and [Google Earth Engine](https://earthengine.google.com/).*
