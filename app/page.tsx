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

function mapsUrl(from:string,to:string,mode:"driving"|"walking"|"transit") {
  return "https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(from)+"&destination="+encodeURIComponent(to)+"&travelmode="+mode;
}

function toMinutes(value:string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1])*60+Number(match[2]) : -1;
}

function formatMinutes(total:number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return String(Math.floor(normalized/60)).padStart(2,"0")+":"+String(normalized%60).padStart(2,"0");
}

export default function Home() {
  const [origin,setOrigin]=useState("Martorelles");
  const [originQuery,setOriginQuery]=useState("Martorelles");
  const [originChoice,setOriginChoice]=useState("Martorelles");
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
  const [selectedTrain,setSelectedTrain]=useState<string | null>(null);

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
      const response = await fetch("/api/rail/board?station=79006", { cache:"no-store" });
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
        {icon:"🚆",mode:"Rodalies",from:"Mollet-Sant Fost",to:"Barcelona-Sants",start:"12:42",end:"13:10",note:"Selecciona un tren real abajo para sustituir este horario estimado"},
        {icon:"🚶",mode:"A pie",from:"Barcelona-Sants",to:destination,start:"13:10",end:"13:38"}
      ]},
      {title:"Alternativa con más margen",arrival:"13:50",duration:"1 h 30 min",legs:[
        {icon:"🚗",mode:"Coche",from:origin,to:"Estació Mollet-Sant Fost",start:"12:20",end:"12:32"},
        {icon:"🚆",mode:"Rodalies",from:"Mollet-Sant Fost",to:"Barcelona-Sants",start:"12:50",end:"13:18"},
        {icon:"🚶",mode:"A pie",from:"Barcelona-Sants",to:destination,start:"13:18",end:"13:50"}
      ]}
    ];
    return [{title:"Transporte público + caminar",arrival:"13:43",duration:"calculando con trenes reales",legs:[
      {icon:"🚆",mode:"Rodalies",from:"Mollet-Sant Fost",to:"Barcelona-Sants",start:"—",end:"—",note:"Consulta las salidas reales para elegir el tren y ver el siguiente si lo pierdes"},
      {icon:"🚶",mode:"A pie",from:"Barcelona-Sants",to:destination,start:"—",end:"—"}
    ]}];
  },[submitted,mode,origin,destination]);

  const liveTrainRows = trains.filter(train => {
    const destination = train.destination.toLowerCase();
    const line = train.line.toUpperCase();
    const southboundDestination = /aeroport|el prat|castelldefels|vilanova|sitges|sant vicenç|garraf|calafell/i.test(destination);
    return /R2N?|R2S/.test(line) && southboundDestination;
  });
  const arrivalMinutes = toMinutes(arrival);
  const trainCandidates = liveTrainRows.map((train,index) => {
    const departure = toMinutes(train.time);
    const travelToSants = 28;
    const walkToDestination = 28;
    const estimatedArrival = departure >= 0 ? departure + travelToSants + walkToDestination : -1;
    return {
      ...train,
      index,
      estimatedArrival,
      catchesIt: departure >= 0 && estimatedArrival <= arrivalMinutes,
      nextAfter: departure >= 0 && departure > 0
    };
  }).slice(0,8);

  const chooseTrain = (train: typeof trainCandidates[number]) => {
    setSelectedTrain(train.id || `${train.train}-${train.time}`);
  };

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
            <button className="locationButton" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? "Localizando…" : "📍 Mi ubicación"}</button>
          </div>
          {locationError && <div className="error">{locationError}</div>}
        </div>
        <div><label className="label">¿A dónde?</label><input className="input" value={destination} onChange={e=>setDestination(e.target.value)} /></div>
        <div className="row">
          <div><label className="label">Quiero llegar a</label><input className="input" type="time" value={arrival} onChange={e=>setArrival(e.target.value)} /></div>
          <div><label className="label">Margen</label><select className="input" value={buffer} onChange={e=>setBuffer(e.target.value)}><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option></select></div>
        </div>
        <div><label className="label">¿Cómo quieres llegar al transporte público?</label><div className="choices"><button className={"choice "+(mode==="car"?"active":"")} onClick={()=>setMode("car")}>🚗 En coche</button><button className={"choice "+(mode==="transit"?"active":"")} onClick={()=>setMode("transit")}>🚶 Sin coche</button></div></div>
        <button className="primary" onClick={()=>{setSubmitted(true); loadTrains();}}>Calcular ruta</button>
        <div className="hint">multiMap usa la hora de llegada, el margen y las conexiones para construir la ruta.</div>
      </div>
    </section>

    {submitted && <section className="results">
      <div className="hint">Resultados para llegar sobre las {arrival}.</div>
      {options.map((option,i)=><article className="option" key={i}>
        <h3>{option.title}</h3><div className="muted">{option.duration} · llegada objetivo {arrival}</div>
        {option.legs.map((leg,j)=><div className="line" key={j}>
          <div className="icon">{leg.icon}</div>
          <div>
            <div className="time">{leg.start} → {leg.end} · {leg.mode}</div>
            <div>{leg.from} → {leg.to}</div>
            {leg.note&&<div className="muted">{leg.note}</div>}
            {(leg.mode==="Coche"||leg.mode==="A pie")&&<a className="link" href={mapsUrl(leg.mode==="Coche"?originQuery:leg.from,leg.to,leg.mode==="Coche"?"driving":"walking")} target="_blank" rel="noreferrer">Abrir tramo en Google Maps ↗</a>}
            {leg.mode==="Rodalies" && <a className="link" href={mapsUrl(leg.from,leg.to,"transit")} target="_blank" rel="noreferrer">Abrir tramo en Google Maps ↗</a>}
          </div>
        </div>)}

         {trainsError && <div className="error">{trainsError}</div>}
          {!trainsError && trainsLoading && trains.length===0 && <div className="muted">Consultando salidas reales…</div>}
          {!trainsError && trainCandidates.map((train,index)=>{
            const key=train.id || `${train.train}-${train.time}-${index}`;
            const isSelected=selectedTrain===key;
            return <button className={"trainCard "+(isSelected?"selectedTrain":"")} key={key} onClick={()=>chooseTrain(train)}>
              <div className="trainTime">{train.time}</div>
              <div className="trainMain"><b>{train.destination}</b><div className="muted">{train.line}{train.train ? ` · tren ${train.train}` : ""}{train.platform ? ` · vía ${train.platform}` : ""}</div></div>
              <div className="trainMeta">{train.delay && train.delay > 0 ? `+${train.delay} min` : "Puntual"}</div>
              <div className="trainFit">{train.catchesIt ? `🟢 Llegada estimada ${formatMinutes(train.estimatedArrival)}` : `🔴 No llega antes de ${arrival}`}</div>
            </button>;
          })}
          {!trainsError && !trainsLoading && trainCandidates.length===0 && <div className="muted">No hay salidas compatibles en el tablero ahora mismo.</div>}
          {trainCandidates.length>0 && <div className="nextHint">Si seleccionas un tren que no puedes coger, el siguiente aparece justo debajo para que puedas comparar el margen.</div>}
          <div className="attribution">Datos ferroviarios públicos de Renfe/ADIF mediante RadarDeTrenes. Actualización aproximada del tablero: 15–30 s. Información orientativa.</div>
        </div>
      </article>)}
    </section>}

 </main>;
        <div>
          <label className="label">¿Desde dónde?</label>
          <select className="input" value={originChoice} onChange={e=>handleOriginChange(e.target.value)}>
            <option value="Martorelles">Martorelles</option>
            <option value="Mollet del Vallès">Mollet del Vallès</option>
            <option value="Barcelona">Barcelona</option>
            <option value="current">{locating ? "📍 Localizando…" : "📍 Mi ubicación actual"}</option>
          </select>
          {originChoice === "current" && origin === "Mi ubicación actual" && <div className="locationSelected">📍 Usando tu ubicación actual</div>}
          {locationError && <div className="error">{locationError}</div>}
        </div>
        <div><label className="label">¿A dónde?</label><input className="input" value={destination} onChange={e=>setDestination(e.target.value)} /></div>
        <div className="row">
          <div><label className="label">Quiero llegar a</label><input className="input" type="time" value={arrival} onChange={e=>setArrival(e.target.value)} /></div>
          <div><label className="label">Margen</label><select className="input" value={buffer} onChange={e=>setBuffer(e.target.value)}><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option></select></div>
        </div>
        <div><label className="label">¿Cómo quieres llegar al transporte público?</label><div className="choices"><button className={"choice "+(mode==="car"?"active":"")} onClick={()=>setMode("car")}>🚗 En coche</button><button className={"choice "+(mode==="transit"?"active":"")} onClick={()=>setMode("transit")}>🚶 Sin coche</button></div></div>
        <button className="primary" onClick={()=>{setSubmitted(true); loadTrains();}}>Calcular ruta</button>
        <div className="hint">multiMap usa la hora de llegada, el margen y las conexiones para construir la ruta.</div>
      </div>
    </section>

    {submitted && <section className="results">
      <div className="hint">Resultados para llegar sobre las {arrival}.</div>
      {options.map((option,i)=><article className="option" key={i}>
        <h3>{option.title}</h3><div className="muted">{option.duration} · llegada objetivo {arrival}</div>
        {option.legs.map((leg,j)=><div className="line" key={j}>
          <div className="icon">{leg.icon}</div>
          <div>
            <div className="time">{leg.start} → {leg.end} · {leg.mode}</div>
            <div>{leg.from} → {leg.to}</div>
            {leg.note&&<div className="muted">{leg.note}</div>}
            {(leg.mode==="Coche"||leg.mode==="A pie")&&<a className="link" href={mapsUrl(leg.mode==="Coche"?originQuery:leg.from,leg.to,leg.mode==="Coche"?"driving":"walking")} target="_blank" rel="noreferrer">Abrir tramo en Google Maps ↗</a>}
            {leg.mode==="Rodalies" && <a className="link" href={mapsUrl(leg.from,leg.to,"transit")} target="_blank" rel="noreferrer">Abrir tramo en Google Maps ↗</a>}
          </div>
        </div>)}

      </article>)}
    </section>}


  </main>;
}