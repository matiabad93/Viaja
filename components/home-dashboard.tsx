'use client';
import {ArrowRight,ArrowUpRight,Bookmark,CalendarDays,Compass,Globe2,MapPin,Plus,Ticket} from 'lucide-react';
import type {Plan} from '../lib/travel';
import {dateLabel,status} from '../lib/travel';
import {todayLocal} from '../lib/date-range';
import {selectHomeTrip} from '../lib/home-journey';

type HomeProps={
 plans:Plan[];cloud:boolean;
 onNew:()=>void;onTrips:()=>void;onExplore:()=>void;onReservations:()=>void;
 onOpenTrip:(plan:Plan)=>void;
};

export function HomeDashboard({plans,cloud,onNew,onTrips,onExplore,onReservations,onOpenTrip}:HomeProps){
 const featured=selectHomeTrip(plans,todayLocal());
 return <section className="home-viaja" aria-label="Inicio de Viaja">
  <div className="home-hero">
   <div className="home-hero-copy">
    <span className="eyebrow">TU ESPACIO PARA VIAJAR MEJOR</span>
    <h1>Todo gran viaje empieza con una idea.</h1>
    <p>Elegí un destino, armá tus días a tu ritmo y tené tus planes y reservas en un solo lugar.</p>
    <div className="home-hero-actions">
     <button className="primary" type="button" onClick={onNew}><Plus size={19}/>Planificar un viaje <ArrowRight size={17}/></button>
     <button className="home-outline" type="button" onClick={onExplore}><Globe2 size={18}/>Explorar destinos</button>
    </div>
    <p className="home-hero-note">Podés empezar sin crear una cuenta ni usar inteligencia artificial.</p>
   </div>
   <aside className="home-featured" aria-label={featured?'Viaje destacado':'Cómo empezar'}>
    {featured?<>
     <div className="home-featured-top"><span className="home-featured-kicker"><Compass size={15}/> RETOMÁ TU AVENTURA</span><span className="home-trip-status">{status(featured)}</span></div>
     <div className="home-featured-body"><MapPin size={26}/><h2>{featured.trip.destination}</h2>
      <p><CalendarDays size={16}/>{featured.trip.start?`${dateLabel(featured.trip.start)}${featured.trip.end?' — '+dateLabel(featured.trip.end):''}`:'Todavía sin fechas'}</p>
     </div>
     <button className="home-featured-link" type="button" onClick={()=>onOpenTrip(featured)}>Abrir este viaje <ArrowUpRight size={19}/></button>
    </>:<>
     <span className="home-featured-kicker"><Compass size={15}/> EMPEZÁ EN TRES PASOS</span>
     <h2>De una idea a un itinerario.</h2>
     <ol className="home-steps">
      <li><span>01</span><div><strong>Elegí a dónde ir</strong><p>Con fechas o sin fechas.</p></div></li>
      <li><span>02</span><div><strong>Contanos qué te gusta</strong><p>Historia, gastronomía, naturaleza y más.</p></div></li>
      <li><span>03</span><div><strong>Organizá tu viaje</strong><p>Una agenda editable, a tu ritmo.</p></div></li>
     </ol>
    </>}
   </aside>
  </div>
  <div className="home-section-heading">
   <div><span className="eyebrow">TODO A MANO</span><h2>¿Qué querés hacer hoy?</h2></div>
   <span className="home-storage-state">{cloud?'Tus viajes se sincronizan con tu cuenta':'Tus viajes se guardan en este dispositivo'}</span>
  </div>
  <div className="home-shortcuts">
   <button type="button" className="home-shortcut" onClick={onTrips}>
    <span className="home-shortcut-icon"><Bookmark size={24}/></span><strong>Mis viajes</strong>
    <p>{plans.length?`${plans.length} ${plans.length===1?'viaje guardado':'viajes guardados'}. Abrí y editá tus itinerarios.`:'Guardá tus planes y retomá cuando quieras.'}</p>
    <span className="home-shortcut-action">Ver mis viajes <ArrowUpRight size={17}/></span>
   </button>
   <button type="button" className="home-shortcut" onClick={onExplore}>
    <span className="home-shortcut-icon"><Globe2 size={24}/></span><strong>Explorar</strong>
    <p>Descubrí guías de destinos e ideas que comparten otros viajeros.</p>
    <span className="home-shortcut-action">Buscar inspiración <ArrowUpRight size={17}/></span>
   </button>
   <button type="button" className="home-shortcut" onClick={onReservations}>
    <span className="home-shortcut-icon"><Ticket size={24}/></span><strong>Reservas</strong>
    <p>Tené a mano tus billetes, alojamientos y documentos de viaje.</p>
    <span className="home-shortcut-action">Ir a reservas <ArrowUpRight size={17}/></span>
   </button>
  </div>
 </section>;
}
