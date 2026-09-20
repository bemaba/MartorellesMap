import { NextRequest, NextResponse } from "next/server";

const RADAR_BASE = "https://radardetrenes.com/api/v1";

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function findArrays(value: unknown): unknown[][] {
  if (!value || typeof value !== "object") return [];
  const arrays: unknown[][] = [];
  if (Array.isArray(value)) arrays.push(value);
  else for (const child of Object.values(value as Record<string, unknown>)) arrays.push(...findArrays(child));
  return arrays;
}

function normalizeTime(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  const iso = raw.match(/T(\d{2}:\d{2})/);
  if (iso) return iso[1];
  const hm = raw.match(/(^|\\s)(\d{1,2}):(\d{2})/);
  return hm ? hm[2].padStart(2,"0")+":"+hm[3] : raw;
}

function normalizeBoard(payload: any) {
  const arrays = findArrays(payload);
  const rows = arrays.find(a => a.some((x:any) => x && typeof x === "object" && (
    "destinationName" in x || "destination" in x || "destino" in x || "departureTime" in x || "scheduledDeparture" in x
  ))) || [];

  return rows.map((row:any) => {
    const delay = Number(row.delayMinutes ?? row.delay ?? row.retrasoMinutos ?? row.delay_min);
    return {
      time: normalizeTime(row.departureTime ?? row.scheduledDeparture ?? row.departure ?? row.horaSalida ?? row.time ?? row.hour),
      destination: text(row.destinationName ?? row.destination ?? row.destino ?? row.arrivalName ?? row.to),
      line: text(row.lineName ?? row.line ?? row.linea ?? row.service),
      train: text(row.trainCode ?? row.trainNumber ?? row.train ?? row.numeroTren ?? row.number),
      delay: Number.isFinite(delay) ? delay : null,
      platform: text(row.platform ?? row.platformName ?? row.via ?? row.track) || null,
      id: text(row.id ?? row.trainId ?? row.tripId) || null
    };
  }).filter((row:any) => row.time && row.destination).slice(0,30);
}

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station") || "79006";
  if (!/^\d+$/.test(station)) {
    return NextResponse.json({ error: "Código de estación no válido." }, { status: 400 });
  }

  try {
    const response = await fetch(`${RADAR_BASE}/stations/${station}/board-renfe`, {
      headers: { "User-Agent": "multiMap/0.1 (travel planner)" },
      next: { revalidate: 15 }
    });
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: payload?.detail || "La fuente ferroviaria no está disponible." }, { status: response.status });
    }
    return NextResponse.json({ trains: normalizeBoard(payload), updatedAt: payload?.updatedAt || new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "No se ha podido conectar con los datos ferroviarios en tiempo real." }, { status: 502 });
  }
}
