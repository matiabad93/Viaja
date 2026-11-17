'use client';
import {useState} from 'react';
import {Plus,Search,ArrowUpRight,Trash2,CalendarDays,Users,MapPin,Globe2,Link2,RefreshCw,LockKeyhole} from 'lucide-react';
import {Plan,status,spent,budgetSpent,money,daysCount,dateLabel} from '../lib/travel';
import {useDestinationCover} from '../lib/destination-covers';
import {todayLocal} from '../lib/date-range';
import {selectVisibleTrips,tripFilterCounts,tripFilters,type TripFilter,type TripSort} from '../lib/trip-list';
export function TripsDashboard({plans,onOpen,onNew,onDelete,onPublish,onUnpublish,publications={},busy=false,cloud=false}:{plans:Plan[];onOpen:(p:Plan,edit?:boolean)=>void;onNew:()=>void;onDelete:(p:Plan)=>void;onPublish:(p:Plan)=>void;onUnpublish:(p:Plan)=>void;publications?:Record<string,string>;busy?:boolean;cloud?:boolean}){
const [copied,setCopied]=useState('');
const copyPublicLink=async(id:string)=>{const link=window.location.origin+'/?viaje='+id;try{await navigator.clipboard.writeText(link);setCopied(id)}catch{setCopied('error:'+id)}};
const [query,setQuery]=useState(''),[filter,setFilter]=useState<TripFilter>('Todos'),[sort,setSort]=useState<TripSort>('Relevancia');
const today=todayLocal();
const counts=tripFilterCounts(plans,today);
const list=selectVisibleTrips(plans,query,filter,sort,today);
const clearFilters=()=>{setQuery('');setFilter('Todos');setSort('Relevancia')};
return <section className="journeys"><div className="section-heading"><div><span className="eyebrow">TU COLECCIÓN PERSONAL</span><h1>Mis viajes</h1><p>Encontrá tus próximos destinos, retomá tus planes y organizá cada viaje desde acá.</p></div><button className="primary" onClick={onNew}><Plus size={18}/>Crear viaje</button></div><div className="journey-toolbar journey-toolbar-v2">
<label className="searchbox"><Search size={18}/><input aria-label="Buscar mis viajes" placeholder="Buscar ciudad, país u origen…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
<div className="journey-toolbar-controls">
 <div className="filterpills" role="group" aria-label="Filtrar viajes por estado">{tripFilters.map(f=><button type="button" aria-pressed={filter===f} key={f} onClick={()=>setFilter(f)}>{f} <span className="journey-filter-count">{counts[f]}</span></button>)}</div>
 <label className="journey-sort">Ordenar por <select aria-label="Ordenar viajes" value={sort} onChange={e=>setSort(e.target.value as TripSort)}><option value="Relevancia">Próximos primero</option><option value="Más recientes">Más recientes</option><option value="Destino A–Z">Destino A–Z</option></select></label>
</div></div>
<div className="journey-results" aria-live="polite"><span>{list.length} {list.length===1?'viaje':'viajes'} {plans.length!==list.length?`de ${plans.length}`:''} · {cloud?'Sincronizados con tu cuenta':'Guardados en este dispositivo'}</span>{(query||filter!=='Todos'||sort!=='Relevancia')&&<button className="journey-clear" type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>
<div className="journey-grid">{list.map(p=><article className="journey-card" key={p.id}><JourneyCover plan={p} onOpen={()=>onOpen(p)}/><div className="journey-content"><span className="eyebrow">{p.kind==='researched'?'INVESTIGADO CON IA':'TU ITINERARIO'} · {publications[p.id]?'PUBLICADO':p.collaboration?.memberCount&&p.collaboration.memberCount>1?'EN EQUIPO':'PRIVADO'}</span><h2><button onClick={()=>onOpen(p)}>{p.trip.destination}</button></h2><p className="inline-meta"><CalendarDays size={15}/>{p.trip.start&&p.trip.end?`${dateLabel(p.trip.start)} — ${dateLabel(p.trip.end)} · ${daysCount(p.trip)||itineraryLength(p)} días`:'Fechas por definir'}</p><p className="inline-meta"><Users size={15}/>{p.trip.travelers} viajeros</p>{p.collaboration?.memberCount&&p.collaboration.memberCount>1?<span className="team-badge"><Users size={14}/> En equipo · {p.collaboration.memberCount} colaboradores</span>:null}<div className="card-budget"><span><small>Gastado</small><strong>{money(spent(p))}</strong></span><span><small>Presupuesto</small><strong>{p.trip.budget>0?money(p.trip.budget):'Sin definir'}</strong></span></div>{p.trip.budget>0&&<progress max={p.trip.budget} value={budgetSpent(p)} aria-label="Presupuesto consumido"/>}<div className="card-actions"><button className="textbtn journey-open-button" onClick={()=>onOpen(p)}>Ver viaje →</button>{p.collaboration?.role!=='viewer'&&<button className="iconbtn" aria-label={'Editar '+p.trip.destination} onClick={()=>onOpen(p,true)}>Editar</button>}<button className="iconbtn" aria-label={(p.collaboration?.role&&p.collaboration.role!=='owner'?'Salir de ':'Eliminar ')+p.trip.destination} onClick={()=>onDelete(p)}><Trash2 size={17}/></button></div>
{(!p.collaboration||p.collaboration.role==='owner')&&<div className="community-owner-actions">
 {publications[p.id]?<>
  <span className="community-published-status"><Globe2 size={14}/> Publicado</span>
  <button type="button" disabled={busy} onClick={()=>onPublish(p)}><RefreshCw size={14}/>Actualizar publicación</button>
  <button type="button" onClick={()=>void copyPublicLink(publications[p.id])}><Link2 size={14}/>{copied===publications[p.id]?'Enlace copiado':copied==='error:'+publications[p.id]?'Copiar desde navegador':'Copiar enlace'}</button>
  <button type="button" disabled={busy} onClick={()=>onUnpublish(p)}><LockKeyhole size={14}/>Retirar</button>
 </>:<button type="button" disabled={busy} onClick={()=>onPublish(p)}><Globe2 size={15}/>Publicar para otros viajeros</button>}
 </div>}</div></article>)}</div>{!list.length&&<div className="premium-empty"><MapPin size={40}/><h2>{plans.length?'No hay viajes con esos filtros':'Tu primer viaje empieza acá.'}</h2><p>{plans.length?'Probá otro destino o limpiá los filtros para volver a ver todos tus viajes.':'Elegí un destino y armá tu itinerario paso a paso, con o sin IA.'}</p>{plans.length?<button className="secondary" type="button" onClick={clearFilters}>Mostrar todos mis viajes</button>:<button className="primary" onClick={onNew}>Planificar mi primer viaje</button>}</div>}</section>}
function itineraryLength(p:Plan){return p.itinerary?.length||p.parts?.length||1}

function JourneyCover({plan,onOpen}:{plan:Plan;onOpen:()=>void}){
 const cover=useDestinationCover(plan.trip.destination,plan.photos,plan.trip.city?.name,plan.photoKey,plan.trip.city?.country);
 return <button className="journey-cover" onClick={onOpen} aria-label={'Abrir '+plan.trip.destination}>{cover.src?<img loading="lazy" src={cover.src} alt={cover.alt} onError={cover.onError}/>:<div className="destination-art"><MapPin size={46} strokeWidth={1}/><span>{plan.trip.destination}</span></div>}<span className="status-pill">{status(plan)}</span><span className="cover-arrow"><ArrowUpRight size={20}/></span></button>
}
