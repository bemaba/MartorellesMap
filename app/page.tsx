"use client";

import { useMemo, useState } from "react";

type Mode = "car" | "transit";
type Leg = { icon:string; mode:string; from:string; to:string; start:string; end:string; note?:string };

function mapsUrl(from:string,to:string,mode:"driving"|"walking") {
  return "https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(from)+"&destination="+encodeURIComponent(to)+"&travelmode="+mode;
}

export default function Home() {
  const [origin,setOrigin]=useState("Martorelles");
  const [destination,setDestination]=useState("CaixaForum Barcelona");
  const [arrival,setArrival]=useState("13:45");
  const [buffer,setBuffer]=useState("10");
  const [mode,setMode]=useState<Mode>("car");
  const [submitted,setSubmitted]=useState(false);

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

  return <main className="shell">
    <header className="hero">
      <div className="logo">MartorellesMap</div>
      <p className="subtitle">Una ruta. Todos los medios. Con los horarios y márgenes pensados para llegar a tiempo.</p>
    </header>

    <section className="card">
      <div className="fields">
        <div><label className="label">¿Desde dónde?</label><input className="input" value={origin} onChange={e=>setOrigin(e.target.value)} /></div>
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
      <div className="hint">Resultados para llegar sobre las {arrival}. Los horarios mostrados ahora son datos de demostración.</div>
      {options.map((option,i)=><article className="option" key={i}>
        <h3>{option.title}</h3><div className="muted">{option.duration} · llegada {option.arrival}<span className="badge">MVP</span></div>
        {option.legs.map((leg,j)=><div className="line" key={j}><div className="icon">{leg.icon}</div><div><div className="time">{leg.start} → {leg.end} · {leg.mode}</div><div>{leg.from} → {leg.to}</div>{leg.note&&<div className="muted">{leg.note}</div>}{(leg.mode==="Coche"||leg.mode==="A pie")&&<a className="link" href={mapsUrl(leg.from,leg.to,leg.mode==="Coche"?"driving":"walking")} target="_blank" rel="noreferrer">Abrir tramo en Google Maps ↗</a>}</div></div>)}
      </article>)}
    </section>}

    <section className="features">
      <div className="feature"><b>🚆 Horarios reales</b><span className="muted">GTFS/GTFS-RT para tren, metro y bus.</span></div>
      <div className="feature"><b>🧮 Cálculo hacia atrás</b><span className="muted">Llegada, transbordos y margen forman una sola ruta.</span></div>
      <div className="feature"><b>🗺️ Navegación</b><span className="muted">Google Maps solo navega cada tramo cuando hace falta.</span></div>
    </section>
  </main>;
}