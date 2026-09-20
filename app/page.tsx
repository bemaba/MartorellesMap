"use client";

import { useMemo, useState } from "react";

type Mode = "car" | "transit";
type Leg = { icon:string; mode:string; from:string; to:string; start:string; end:string; note?:string };

type Train = {
  time: string;
  destination: string;
  line: string;
  train: string;
  delay?: number | null;
  platform?: string | null;
  id?: string | null;
};

function mapsUrl(from:string,to:string,mode:"driving"|"walking") {
  return "https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(from)+"&destination="+encodeURIComponent(to)+"&travelmode="+mode;
}

export default function Home() {
  const [origin,setOrigin]=useState("Martorelles");
  const [originQuery,setOriginQuery]=useState("Martorelles");
  const [destination,setDestination]=useState("CaixaForum Barcelona");
  const [arrival,setArrival]=useState("13:45");
  const [buffer,setBuffer]=useState("10");
  const [mode,setMode]=useState<Mode>("car");
  const [submitted,setSubmitted]=useState(false);
  const [locating,setLocating]=useState(false);
  const [locationError,setLocationError]=useState("");
  const [trains,setTrains]=useState<Train[]>([]);
  const [trainsLoading,setTrainsLoading]=useState(false);
  const [trainsError,setTrainsError]=useState("");

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
        setLocating(false);
      },
      () => {
        setLocationError("No hemos podido obtener tu ubicación. Comprueba los permisos del navegador.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleOriginChange = (value:string) => {
    setOrigin(value);
    setOriginQuery(value);
  };

  const loadTrains = async () => {
    setTrainsLoading(true);
    setTrainsError("");
    try {
      const response = await fetch("/api/rail/board?station=79006");
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se ha podido consultar el tablero.");
      setTrains(data.trains || []);
    } catch (error) {
      setTrainsError(error instanceof Error ? error.message : "No se ha podido consultar los trenes.");
    } finally {
      setTrainsLoading(false);
    }
  };

  const options = useMemo(() => {
    if (!submitted) return [];
    if (mode === "car") return [
      {title:"En coche + tren + caminar",arrival:"13:38",duration:"1 h 26 min",legs:[
        {icon:"🚗",mode:"Coche",from:origin,to:"Estació Mollet-Sant Fost",start:"12:12",end:"12:24",note:"Aparcamiento y acceso a estación incluidos en el margen"},
        {icon:"🚆",mode:"Rodalies",from:"Mollet-Sant Fost",to:"Barcelona-Sants",start:"12:42",end:"13:10",note:"Margen de 18 min para llegar al andén"},
        {icon:"🚶",mode:"A pie",from:"Barcelona-Sants",to:destination,start:"13:10",end:"13:38"}
      ]},
      {title:"Alternativa con más margen",arrival:"13:50",duration:"1 h 30 min",legs:[
        {icon:"🚗",mode:"Coche",from:origin,to:"Estació Mollet-Sant Fost",start:"12:20",end:"12:32"},
        {icon:"🚆",mode:"Rodalies",from:"Mollet-Sant Fost",to:"Barcelona-Sants",start:"12:50",end:"13:18"},
        {icon:"🚶",mode:"A pie",from:"Barcelona-Sants",to:destination,start:"13:18",end:"13:50"}
      ]}
    ];
    return [{title:"Transporte público + caminar",arrival:"13:43",duration:"1 h 03 min",legs:[
      {icon:"🚌",mode:"Transporte público",from:origin,to:"Barcelona-Sants",start:"12:38",end:"13:18",note:"En el siguiente paso sustituiremos esta estimación por horarios GTFS reales"},
      {icon:"🚶",mode:"A pie",from:"Barcelona-Sants",to:destination,start:"13:18",end:"13:43"}
    ]}];
  },[submitted,mode,origin,destination]);

  const liveTrainRows = trains.filter(train =>
    /barcelona|sants/i.test(train.destination)
  );

  return <main className="shell">
    <header className="hero">
      <div className="logo">multiMap</div>
      <p className="subtitle">Una ruta. Todos los medios. Con los horarios y márgenes pensados para llegar a tiempo.</p>
    </header>

    <section className="card">
      <div className="fields">
        <div>
          <label className="label">¿Desde dónde?</label>
          <div className="locationRow">
            <input className="input" value={origin} onChange={e=>handleOriginChange(e.target.value)} />
            <button className="locationButton" type="button" onClick={useCurrentLocation} disabled={locating}>
              {locating ? "Localizando…" : "📍 Mi ubicación"}
            </button>
          </div>
          {locationError && <div className="error">{locationError}</div>}
        </div>
        <div><label className="label">¿A dónde?</label><input className="input" value={destination} onChange={e=>setDestination(e.target.value)} /></div>
        <div className="row">
          <div><label className="label">Quiero llegar a</label><input className="input" type="time" value={arrival} onChange={e=>setArrival(e.target.value)} /></div>
          <div><label className="label">Margen</label><select className="input" value={buffer} onChange={e=>setBuffer(e.target.value)}><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option></select></div>
        </div>
        <div><label className="label">¿Cómo quieres llegar al transporte público?</label><div className="choices"><button className={"choice "+(mode==="car"?"active":"")} onClick={()=>setMode("car")}>🚗 En coche</button><button className={"choice "+(mode==="transit"?"active":"")} onClick={()=>setMode("transit")}>🚶 Sin coche</button></div></div>
        <button className="primary" onClick={()=>setSubmitted(true)}>Calcular ruta</button>
        <div className="hint">El motor calculará hacia atrás desde tu hora de llegada y tendrá en cuenta conexiones y márgenes.</div>
      </div>
    </section>

    {submitted && <section className="results">
      <div className="hint">Resultados para llegar sobre las {arrival}.</div>
      {options.map((option,i)=><article className="option" key={i}>
        <h3>{option.title}</h3><div className="muted">{option.duration} · llegada {option.arrival}</div>
        {option.legs.map((leg,j)=><div className="line" key={j}>
          <div className="icon">{leg.icon}</div>
          <div>
            <div className="time">{leg.start} → {leg.end} · {leg.mode}</div>
            <div>{leg.from} → {leg.to}</div>
            {leg.note&&<div className="muted">{leg.note}</div>}
            {(leg.mode==="Coche"||leg.mode==="A pie")&&<a className="link" href={mapsUrl(leg.mode==="Coche"?originQuery:leg.from,leg.to,leg.mode==="Coche"?"driving":"walking")} target="_blank" rel="noreferrer">Abrir tramo en Google Maps ↗</a>}
            {leg.mode==="Rodalies" && <button className="trainButton" onClick={loadTrains}>{trainsLoading ? "Consultando trenes…" : "🚆 Ver trenes reales y siguientes"}</button>}
          </div>
        </div>)}

        {option.legs.some(leg=>leg.mode==="Rodalies") && (trains.length>0 || trainsError) && <div className="liveBoard">
          <div className="liveHeader">
            <div><b>Próximos trenes desde Mollet-Sant Fost</b><div className="muted">Datos en tiempo real del tablero ferroviario</div></div>
            <button className="refreshButton" onClick={loadTrains} disabled={trainsLoading}>↻ Actualizar</button>
          </div>
          {trainsError && <div className="error">{trainsError}</div>}
          {!trainsError && liveTrainRows.slice(0,5).map((train,index)=><div className={"trainRow "+(index===0?"nextTrain":"")} key={train.id || train.train+train.time+index}>
            <div className="trainTime">{train.time}</div>
            <div><b>{train.destination}</b><div className="muted">{train.line} · tren {train.train}{train.platform ? ` · vía ${train.platform}` : ""}</div></div>
            <div className="trainStatus">{train.delay && train.delay > 0 ? `+${train.delay} min` : "Puntual"}</div>
          </div>)}
          {!trainsError && liveTrainRows.length===0 && <div className="muted">No hay salidas a Barcelona en el tablero en este momento.</div>}
          {liveTrainRows.length>1 && <div className="nextHint">Si pierdes el próximo, multiMap te mostrará automáticamente el siguiente disponible y podrá recalcular el margen de llegada.</div>}
          <div className="attribution">Fuente: datos públicos de Renfe/ADIF a través de RadarDeTrenes. Información orientativa.</div>
        </div>}
      </article>)}
    </section>}

    <section className="features">
      <div className="feature"><b>🚆 Horarios reales</b><span className="muted">Trenes y estado del servicio con datos actualizados.</span></div>
      <div className="feature"><b>🧮 Cálculo hacia atrás</b><span className="muted">Llegada, transbordos y margen forman una sola ruta.</span></div>
      <div className="feature"><b>🗺️ Navegación</b><span className="muted">Google Maps solo navega cada tramo cuando hace falta.</span></div>
    </section>
  </main>;
}