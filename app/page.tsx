"use client";

import { useMemo, useState } from "react";

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

function mapsUrl(from: string, to: string, mode: "driving" | "walking" | "transit") {
  return "https://www.google.com/maps/dir/?api=1&origin=" +
    encodeURIComponent(from) +
    "&destination=" +
    encodeURIComponent(to) +
    "&travelmode=" +
    mode;
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

  const options = useMemo(() => {
    if (!submitted) return [];

    if (mode === "car") {
      return [
        {
          title: "En coche + tren + caminar",
          arrival: "13:38",
          duration: "1 h 26 min",
          legs: [
            {
              icon: "🚗",
              mode: "Coche",
              from: origin,
              to: "Estació Mollet-Sant Fost",
              start: "12:12",
              end: "12:24",
              note: "Aparcamiento y acceso a estación incluidos en el margen",
            },
            {
              icon: "🚆",
              mode: "Rodalies",
              from: "Mollet-Sant Fost",
              to: "Barcelona-Sants",
              start: "12:42",
              end: "13:10",
            },
            {
              icon: "🚶",
              mode: "A pie",
              from: "Barcelona-Sants",
              to: destination,
              start: "13:10",
              end: "13:38",
            },
          ] as Leg[],
        },
        {
          title: "Alternativa con más margen",
          arrival: "13:50",
          duration: "1 h 30 min",
          legs: [
            {
              icon: "🚗",
              mode: "Coche",
              from: origin,
              to: "Estació Mollet-Sant Fost",
              start: "12:20",
              end: "12:32",
            },
            {
              icon: "🚆",
              mode: "Rodalies",
              from: "Mollet-Sant Fost",
              to: "Barcelona-Sants",
              start: "12:50",
              end: "13:18",
            },
            {
              icon: "🚶",
              mode: "A pie",
              from: "Barcelona-Sants",
              to: destination,
              start: "13:18",
              end: "13:50",
            },
          ] as Leg[],
        },
      ];
    }

    return [
      {
        title: "Transporte público + caminar",
        arrival: "13:43",
        duration: "1 h 18 min",
        legs: [
          {
            icon: "🚆",
            mode: "Rodalies",
            from: "Mollet-Sant Fost",
            to: "Barcelona-Sants",
            start: "12:35",
            end: "13:05",
          },
          {
            icon: "🚶",
            mode: "A pie",
            from: "Barcelona-Sants",
            to: destination,
            start: "13:05",
            end: "13:43",
          },
        ] as Leg[],
      },
    ];
  }, [submitted, mode, origin, destination]);

  return (
    <main className="shell">
      <header className="hero">
        <div className="logo">multiMap</div>
        <p className="subtitle">
          Una ruta. Todos los medios. Con los horarios y márgenes pensados para llegar a tiempo.
        </p>
      </header>

      <section className="card">
        <div className="fields">
          <div>
            <label className="label">¿Desde dónde?</label>
            <select
              className="input"
              value={originChoice}
              onChange={(e) => handleOriginChange(e.target.value)}
            >
              <option value="Martorelles">Martorelles</option>
              <option value="Mollet del Vallès">Mollet del Vallès</option>
              <option value="Barcelona">Barcelona</option>
              <option value="current">
                {locating ? "📍 Localizando…" : "📍 Mi ubicación actual"}
              </option>
            </select>
            {originChoice === "current" && origin === "Mi ubicación actual" && (
              <div className="locationSelected">📍 Usando tu ubicación actual</div>
            )}
            {locationError && <div className="error">{locationError}</div>}
          </div>

          <div>
            <label className="label">¿A dónde?</label>
            <input
              className="input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="row">
            <div>
              <label className="label">Quiero llegar a</label>
              <input
                className="input"
                type="time"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
              />
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
              <button
                type="button"
                className={"choice " + (mode === "car" ? "active" : "")}
                onClick={() => setMode("car")}
              >
                🚗 En coche
              </button>
              <button
                type="button"
                className={"choice " + (mode === "transit" ? "active" : "")}
                onClick={() => setMode("transit")}
              >
                🚶 Sin coche
              </button>
            </div>
          </div>

          <button
            className="primary"
            type="button"
            onClick={() => setSubmitted(true)}
          >
            Calcular ruta
          </button>

          <div className="hint">
            multiMap usa la hora de llegada, el margen y las conexiones para construir la ruta.
          </div>
        </div>
      </section>

      {submitted && (
        <section className="results">
          <div className="hint">Resultados para llegar sobre las {arrival}.</div>

          {options.map((option, i) => (
            <article className="option" key={i}>
              <h3>{option.title}</h3>
              <div className="muted">
                {option.duration} · llegada objetivo {arrival}
              </div>

              {option.legs.map((leg, j) => (
                <div className="line" key={j}>
                  <div className="icon">{leg.icon}</div>
                  <div>
                    <div className="time">
                      {leg.start} → {leg.end} · {leg.mode}
                    </div>
                    <div>
                      {leg.from} → {leg.to}
                    </div>
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
                      <a
                        className="link"
                        href={mapsUrl(leg.from, leg.to, "transit")}
                        target="_blank"
                        rel="noreferrer"
                      >
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
