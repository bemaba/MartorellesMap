"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Mode = "car" | "transit";
type Leg = {
  icon: string;
  mode: string;
  from: string;
  to: string;
  start: string;
  end: string;
  note?: string;
};
type Train = {
  time: string;
  destination: string;
  line: string;
  train: string;
  delay?: number | null;
  platform?: string | null;
  id?: string | null;
};

function mapsUrl(from: string, to: string, mode: "driving" | "walking" | "transit") {
  return "https://www.google.com/maps/dir/?api=1&origin=" +
    encodeURIComponent(from) +
    "&destination=" +
    encodeURIComponent(to) +
    "&travelmode=" +
    mode;
}

function toMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
}

function formatMinutes(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return String(Math.floor(normalized / 60)).padStart(2, "0") + ":" + String(normalized % 60).padStart(2, "0");
}

function isSouthboundToBarcelona(train: Train) {
  const line = train.line.toUpperCase();
  const destination = train.destination.toLowerCase();
  if (!/R2N?|R2S/.test(line)) return false;
  return /aeroport|el prat|castelldefels|vilanova|sitges|garraf|calafell|sant vicenç|barcelona/.test(destination);
}

export default function Home() {
  const [origin, setOrigin] = useState("Martorelles");
  const [originQuery, setOriginQuery] = useState("Martorelles");
  const [originChoice, setOriginChoice] = useState("Martorelles");
  const [destination, setDestination] = useState("CaixaForum Barcelona");
  const [arrival, setArrival] = useState("13:45");
  const [buffer, setBuffer] = useState("10");
  const [mode, setMode] = useState<Mode>("car");
  const [submitted, setSubmitted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [trains, setTrains] = useState<Train[]>([]);
  const [trainsLoading, setTrainsLoading] = useState(false);
  const [trainsError, setTrainsError] = useState("");
  const [trainsUpdatedAt, setTrainsUpdatedAt] = useState("");

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite obtener la ubicación.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates = `${coords.latitude}, ${coords.longitude}`;
        setOrigin("Mi ubicación actual");
        setOriginQuery(coordinates);
        setOriginChoice("current");
        setLocating(false);
      },
      () => {
        setLocationError("No hemos podido obtener tu ubicación. Comprueba los permisos del navegador.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleOriginChange = (value: string) => {
    setOriginChoice(value);

    if (value === "current") {
      useCurrentLocation();
      return;
    }

    setOrigin(value);
    setOriginQuery(value);
    setLocationError("");
  };

  const loadTrains = useCallback(async () => {
    setTrainsLoading(true);
    setTrainsError("");

    try {
      const response = await fetch("/api/rail/board?station=79006", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "La fuente ferroviaria no está disponible.");
      }

      setTrains(data.trains || []);
      setTrainsUpdatedAt(data.updatedAt || new Date().toISOString());
    } catch (error) {
      setTrainsError(error instanceof Error ? error.message : "No se han podido consultar los trenes.");
    } finally {
      setTrainsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrains();
    const timer = window.setInterval(loadTrains, 30000);
    return () => window.clearInterval(timer);
  }, [loadTrains]);

  const liveTrains = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return trains
      .filter(isSouthboundToBarcelona)
      .map((train) => ({ ...train, minutes: toMinutes(train.time) }))
      .filter((train) => train.minutes >= nowMinutes - 2)
      .sort((a, b) => a.minutes - b.minutes)
      .slice(0, 8);
  }, [trains]);

  const options = useMemo(() => {
    if (!submitted) return [];

    const firstTrain = liveTrains[0];
    const firstTrainTime = firstTrain?.time || "—";

    if (mode === "car") {
      return [
        {
          title: "En coche + tren + caminar",
          arrival: "estimada",
          duration: "depende del tren real seleccionado",
          legs: [
            {
              icon: "🚗",
              mode: "Coche",
              from: origin,
              to: "Estació Mollet-Sant Fost",
              start: "estimado",
              end: "estimado",
              note: `Tiempo de acceso en coche no calculado todavía. El tren disponible más próximo sale a las ${firstTrainTime}.`,
            },
            {
              icon: "🚆",
              mode: "Rodalies",
              from: "Mollet-Sant Fost",
              to: "Barcelona-Sants",
              start: firstTrainTime,
              end: "según servicio",
              note: "Hora de salida obtenida del tablero ferroviario en tiempo real.",
            },
            {
              icon: "🚶",
              mode: "A pie",
              from: "Barcelona-Sants",
              to: destination,
              start: "según llegada del tren",
              end: "estimado",
            },
          ] as Leg[],
        },
      ];
    }

    return [
      {
        title: "Transporte público + caminar",
        arrival: "estimada",
        duration: "depende del tren real seleccionado",
        legs: [
          {
            icon: "🚆",
            mode: "Rodalies",
            from: "Mollet-Sant Fost",
            to: "Barcelona-Sants",
            start: firstTrainTime,
            end: "según servicio",
            note: "Selecciona uno de los trenes reales de abajo. No se muestran horarios inventados.",
          },
          {
            icon: "🚶",
            mode: "A pie",
            from: "Barcelona-Sants",
            to: destination,
            start: "según llegada del tren",
            end: "estimado",
          },
        ] as Leg[],
      },
    ];
  }, [submitted, mode, origin, destination, liveTrains]);

  return (
    <main className="shell">
      <header className="hero">
        <div className="logo">multiMap</div>
        <p className="subtitle">
          Una ruta. Todos los medios. Con horarios reales cuando están disponibles.
        </p>
      </header>

      <section className="card">
        <div className="fields">
          <div>
            <label className="label">¿Desde dónde?</label>
            <select className="input" value={originChoice} onChange={(e) => handleOriginChange(e.target.value)}>
              <option value="Martorelles">Martorelles</option>
              <option value="Mollet del Vallès">Mollet del Vallès</option>
              <option value="Barcelona">Barcelona</option>
              <option value="current">{locating ? "📍 Localizando…" : "📍 Mi ubicación actual"}</option>
            </select>
            {originChoice === "current" && origin === "Mi ubicación actual" && (
              <div className="locationSelected">📍 Usando tu ubicación actual</div>
            )}
            {locationError && <div className="error">{locationError}</div>}
          </div>

          <div>
            <label className="label">¿A dónde?</label>
            <input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>

          <div className="row">
            <div>
              <label className="label">Quiero llegar a</label>
              <input className="input" type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} />
            </div>
            <div>
              <label className="label">Margen</label>
              <select className="input" value={buffer} onChange={(e) => setBuffer(e.target.value)}>
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="20">20 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">¿Cómo quieres llegar al transporte público?</label>
            <div className="choices">
              <button type="button" className={"choice " + (mode === "car" ? "active" : "")} onClick={() => setMode("car")}>
                🚗 En coche
              </button>
              <button type="button" className={"choice " + (mode === "transit" ? "active" : "")} onClick={() => setMode("transit")}>
                🚶 Sin coche
              </button>
            </div>
          </div>

          <button className="primary" type="button" onClick={() => setSubmitted(true)}>
            Calcular ruta
          </button>

          <div className="hint">
            Los horarios de Rodalies se consultan desde el tablero ferroviario en tiempo real.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>🚆 Próximos trenes reales</h2>
              <div className="muted">Mollet-Sant Fost → Barcelona · R2/R2N</div>
            </div>
            <button className="choice" type="button" onClick={loadTrains} disabled={trainsLoading}>
              {trainsLoading ? "Actualizando…" : "↻ Actualizar"}
            </button>
          </div>

          {trainsError && <div className="error" style={{ marginTop: 12 }}>{trainsError}</div>}

          {!trainsError && liveTrains.length === 0 && !trainsLoading && (
            <div className="muted" style={{ marginTop: 12 }}>
              No hay salidas compatibles en el tablero en este momento.
            </div>
          )}

          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {liveTrains.map((train, index) => (
              <div key={train.id || `${train.train}-${train.time}-${index}`} className="trainCard">
                <div className="trainTime">{train.time}</div>
                <div className="trainMain">
                  <b>{train.destination}</b>
                  <div className="muted">
                    {train.line || "Rodalies"}
                    {train.train ? ` · tren ${train.train}` : ""}
                    {train.platform ? ` · vía ${train.platform}` : ""}
                  </div>
                </div>
                <div className="trainMeta">
                  {train.delay && train.delay > 0 ? `+${train.delay} min` : "Puntual"}
                </div>
              </div>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 12 }}>
            {trainsUpdatedAt
              ? `Datos actualizados: ${new Date(trainsUpdatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}. Se refrescan automáticamente cada 30 s.`
              : "Consultando datos en tiempo real…"}
          </div>
          <div className="attribution" style={{ marginTop: 8 }}>
            Datos públicos de Renfe/ADIF mediante RadarDeTrenes. Información orientativa; puede haber retrasos o interrupciones en la fuente.
          </div>
        </div>
      </section>

      {submitted && (
        <section className="results">
          <div className="hint">Resultado orientativo para llegar sobre las {arrival}.</div>

          {options.map((option, i) => (
            <article className="option" key={i}>
              <h3>{option.title}</h3>
              <div className="muted">{option.duration} · objetivo {arrival}</div>

              {option.legs.map((leg, j) => (
                <div className="line" key={j}>
                  <div className="icon">{leg.icon}</div>
                  <div>
                    <div className="time">{leg.start} → {leg.end} · {leg.mode}</div>
                    <div>{leg.from} → {leg.to}</div>
                    {leg.note && <div className="muted">{leg.note}</div>}

                    {(leg.mode === "Coche" || leg.mode === "A pie") && (
                      <a
                        className="link"
                        href={mapsUrl(
                          leg.mode === "Coche" ? originQuery : leg.from,
                          leg.to,
                          leg.mode === "Coche" ? "driving" : "walking"
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir tramo en Google Maps ↗
                      </a>
                    )}

                    {leg.mode === "Rodalies" && (
                      <a className="link" href={mapsUrl(leg.from, leg.to, "transit")} target="_blank" rel="noreferrer">
                        Abrir tramo en Google Maps ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
