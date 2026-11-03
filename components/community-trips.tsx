'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,Compass,Copy,ArrowLeft,ArrowRight,Search,MapPin,BookmarkPlus,Globe2,Clock3,TrainFront} from 'lucide-react';
import {getCommunityTrip,listCommunityTrips} from '../lib/supabase-client';
import {communityTripToDraft,type CommunityTrip} from '../lib/community-trips';
import type {Plan} from '../lib/travel';

export function CommunityTrips({onUse,initialId}:{onUse:(plan:Plan)=>void;initialId?:string}){
 const [items,setItems]=useState<CommunityTrip[]>([]);
 const [selected,setSelected]=useState<CommunityTrip|null>(null);
 const [search,setSearch]=useState('');
 const [pace,setPace]=useState('Todos');
 const [length,setLength]=useState('Todos');
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState('');
 const [showLink,setShowLink]=useState(false);
 const [reload,setReload]=useState(0);
 useEffect(()=>{
  let live=true;setLoading(true);setNotice('');
  Promise.all([listCommunityTrips(),initialId?getCommunityTrip(initialId):Promise.resolve(null)]).then(([trips,focused])=>{
   if(!live)return;
   setItems(trips);if(focused)setSelected(focused);
   else if(initialId)setNotice('Este enlace no corresponde a un viaje publicado o su autor lo retiró.');
  }).catch(e=>{if(live)setNotice(e instanceof Error?e.message:'No se pudieron cargar los viajes públicos.')})
    .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[initialId,reload]);
 const visible=useMemo(()=>items.filter(p=>{
  const q=search.toLocaleLowerCase('es').trim();
  return (!q||[p.destination,...(p.content?.route||[])].join(' ').toLocaleLowerCase('es').includes(q))
   &&(pace==='Todos'||pace===p.pace)
   &&(length==='Todos'||(length==='1-3'?p.days_count<=3:length==='4-7'?p.days_count>=4&&p.days_count<=7:p.days_count>=8));
 }),[items,search,pace,length]);
 const share=async(p:CommunityTrip)=>{
  const url=window.location.origin+'/?viaje='+p.id;
  setShowLink(true);
  try{await navigator.clipboard.writeText(url);setNotice('Enlace público copiado. Podés enviarlo a quien quieras.')}
  catch{setNotice('Seleccioná y copiá el enlace mostrado abajo.')}
 };
 const link=selected?typeof window==='undefined'?'/?viaje='+selected.id:window.location.origin+'/?viaje='+selected.id:'';
 if(selected)return <section className="community-explore">
  <button className="backlink" type="button" onClick={()=>{setSelected(null);setShowLink(false);setNotice('')}}><ArrowLeft size={16}/>Todos los viajes compartidos</button>
  <div className="community-hero"><span className="eyebrow"><Globe2 size={15}/> ITINERARIO COMPARTIDO</span>
   <h1>{selected.title}</h1>
   <p>Una ruta creada por otra persona y compartida voluntariamente. Podés explorarla o guardarte una copia para adaptarla a tu viaje.</p>
   <div className="community-tags"><span><CalendarDays size={15}/>{selected.days_count} días</span><span><Compass size={15}/>{selected.pace}</span><span><TrainFront size={15}/>{selected.transport}</span></div>
   <div className="community-actions">
    <button className="primary" type="button" onClick={()=>onUse(communityTripToDraft(selected))}><BookmarkPlus size={17}/>Guardar una copia editable <ArrowRight size={16}/></button>
    <button className="secondary" type="button" onClick={()=>void share(selected)}><Copy size={16}/>Copiar enlace</button>
   </div>
   {showLink&&<label className="community-link-label">Enlace para compartir<input readOnly onFocus={e=>e.currentTarget.select()} value={link}/></label>}
  </div>
  {notice&&<p role="status" className="message">{notice}</p>}
  <p className="community-disclaimer">Las fechas, el alojamiento, los gastos y las reservas privadas del autor no están publicados. Este itinerario es orientativo; verificá horarios y disponibilidad.</p>
  <div className="community-days">{(selected.content?.days||[]).map((day,i)=><section className="community-day" key={i}>
   <div className="community-day-heading"><span>DÍA {i+1}</span><h2>{day.title}</h2></div>
   {day.advice&&<p className="community-day-advice">{day.advice}</p>}
   <div className="community-stops">{day.activities.map((a,j)=><article key={j} className="community-stop">
    <span className="community-stop-count">{j+1}</span><div><h3>{a.title}</h3><div className="community-stop-meta">{a.time&&<span><Clock3 size={14}/>{a.time}</span>}{a.duration&&<span>{a.duration}</span>}{a.location&&<span><MapPin size={14}/>{a.location}</span>}</div>{a.description&&<p>{a.description}</p>}</div>
   </article>)}</div>
   {!day.activities.length&&<p className="subtle">Día sin actividades programadas.</p>}
  </section>)}</div>
 </section>;
 return <section className="community-explore">
  <div className="section-heading"><div><span className="eyebrow">ITINERARIOS DE OTROS VIAJEROS</span><h1>Ideas que se comparten.</h1><p>Explorá viajes publicados voluntariamente, descubrí cómo los organizaron y guardate una copia editable.</p></div>
   <button type="button" className="secondary" onClick={()=>setReload(n=>n+1)}>Actualizar viajes</button></div>
  <div className="community-filters">
   <label className="searchbox"><Search size={18}/><input aria-label="Buscar viajes compartidos" placeholder="Buscar destino (por ejemplo, Colmar)" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <label>Ritmo<select aria-label="Filtrar por ritmo" value={pace} onChange={e=>setPace(e.target.value)}>{['Todos','Tranquilo','Equilibrado','Intenso'].map(k=><option key={k}>{k}</option>)}</select></label>
   <label>Duración<select aria-label="Filtrar por duración" value={length} onChange={e=>setLength(e.target.value)}><option>Todos</option><option value="1-3">1–3 días</option><option value="4-7">4–7 días</option><option value="8+">8 días o más</option></select></label>
  </div>
  <p className="subtle" role="status">{loading?'Buscando viajes compartidos…':visible.length+' viajes publicados'} {notice&&'· '+notice}</p>
  {!loading&&visible.length===0&&<div className="premium-empty"><Globe2 size={37}/><h2>{items.length?'No encontramos ese recorrido.':'La biblioteca está empezando.'}</h2><p>{items.length?'Probá otro destino o quitá los filtros.':'Cuando alguien publique su itinerario, aparecerá aquí. Desde «Mis viajes» podés compartir el tuyo.'}</p></div>}
  <div className="community-grid">{visible.map(p=><article className="community-card" key={p.id}>
   <div className="community-card-cover"><Globe2 size={29}/><span>VIAJE COMPARTIDO</span></div>
   <div className="community-card-body"><h2>{p.title}</h2><p><MapPin size={15}/>{p.content?.route?.join(' → ')||p.destination}</p>
   <div className="community-tags"><span><CalendarDays size={15}/>{p.days_count} días</span><span>{p.pace}</span><span>{p.transport}</span></div>
   <button className="textbtn" type="button" onClick={()=>{setSelected(p);setShowLink(false);window.scrollTo(0,0)}}>Ver itinerario y copiarlo <ArrowRight size={16}/></button>
   </div>
  </article>)}</div>
 </section>;
}
