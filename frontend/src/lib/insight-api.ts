const API_BASE_URL = "http://localhost:8000";

export async function fetchPointInsight(longitude: number, latitude: number) {
    const res = await fetch(`${API_BASE_URL}/insight/point`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ longitude, latitude }),
    });
    return res.json();
}

export async function fetchReverseGeocode(longitude: number, latitude: number) {
    const res = await fetch(`${API_BASE_URL}/insight/reverse-geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ longitude, latitude }),
    });
    return res.json();
}

export async function fetchRegionInsight(params: { bbox?: number[]; feature_id?: string }) {
    const res = await fetch(`${API_BASE_URL}/insight/region`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return res.json();
}

export async function fetchFindExtreme(params: { metric: string; mode: "max" | "min"; top_n?: number }) {
    const res = await fetch(`${API_BASE_URL}/insight/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return res.json();
}

export async function fetchProximity(params: {
    longitude: number;
    latitude: number;
    radius_meters: number;
    metric?: string;
    threshold?: number;
}) {
    const res = await fetch(`${API_BASE_URL}/insight/proximity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return res.json();
}

export async function fetchComparison(targets: Array<{ feature_id?: string; longitude?: number; latitude?: number }>) {
    const res = await fetch(`${API_BASE_URL}/insight/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
    });
    return res.json();
}

export async function fetchTemporalTrend(params: {
    feature_id?: string;
    longitude?: number;
    latitude?: number;
    metric: string;
}) {
    const res = await fetch(`${API_BASE_URL}/insight/temporal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return res.json();
}
