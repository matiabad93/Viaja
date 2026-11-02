'use client';
import {ArrowRight,CalendarDays,Compass,MapPinned,Briefcase,Globe2,Star,MapPin,Sparkles} from 'lucide-react';

type PageAction=()=>void;
export function TupaPremiumHome({onPlan,onSaved,onExplore,onColmar,onSantorini}:{onPlan:PageAction;onSaved:PageAction;onExplore:PageAction;onColmar:PageAction;onSantorini:PageAction}){
 return <section className="tupa-premium-home" aria-label="Inicio Tupã Travel">
  <div className="tupa-royal">
   <div className="tupa-home-emblem"><img src="/tupa-premium-emblem.svg" width="172" height="172" alt="Tupã Travel · sol, mar y avión en dorado"/></div>
   <div className="tupa-home-welcome">
    <span className="tupa-home-eyebrow"><span/> EL ARTE DE DESCUBRIR EL MUNDO <span/></span>
    <h1>¡Bienvenido a <em>Tupã Travel</em>!</h1>
    <p>PLANIFICÁ, DESCUBRÍ Y VIVÍ<br/>VIAJES EXTRAORDINARIOS</p>
    <i aria-hidden="true"/>
   </div>
   <article className="tupa-feature-hero">
    <img className="tupa-feature-picture"
      src="https://commons.wikimedia.org/wiki/Special:FilePath/Sunset_in_Oia%2C_Santorini.jpg?width=1280"
      onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/demo/colmar.jpg'}}
      alt="Vista panorámica al atardecer del pueblo de Oia, Santorini"/>
    <div className="tupa-feature-veil"/>
    <div className="tupa-feature-body">
     <span>DESTINO DESTACADO</span>
     <h2>Santorini</h2>
     <p>El encanto eterno<br/>del Mediterráneo</p>
     <button type="button" onClick={onSantorini}>Descubrir destino <ArrowRight size={19}/></button>
    </div>
    <a className="tupa-photo-credit" href="https://commons.wikimedia.org/wiki/File:Sunset_in_Oia,_Santorini.jpg" target="_blank" rel="noopener noreferrer" title="Fotografía Michael Nicht, licencia CC BY-SA 4.0">Foto: Michael Nicht · CC BY-SA 4.0</a>
   </article>
   <nav className="tupa-quick-actions" aria-label="Acciones principales">
    <button type="button" className="tupa-quick-primary" onClick={onPlan}><CalendarDays size={30}/><strong>Planificar</strong><small>Creá tu itinerario</small></button>
    <button type="button" onClick={onSaved}><Briefcase size={30}/><strong>Mis viajes</strong><small>Todo en un lugar</small></button>
    <button type="button" onClick={onExplore}><Compass size={30}/><strong>Explorar<br/>destinos</strong><small>Descubrí tu próxima ruta</small></button>
   </nav>
  </div>
  <div className="tupa-premium-selection">
   <div className="tupa-selection-title"><div><span className="tupa-overline">RUTAS PARA INSPIRARTE</span><h2>Viajes destacados</h2><p>ITINERARIOS PARA IMAGINAR TU PRÓXIMA AVENTURA</p></div><button type="button" onClick={onExplore}>Ver todos <ArrowRight size={18}/></button></div>
   <article className="tupa-featured-card">
    <div className="tupa-featured-img"><img src="/demo/colmar.jpg" alt="Casas históricas junto al canal de la Pequeña Venecia de Colmar" loading="lazy"/><span><Star size={14} fill="currentColor"/> RUTA DESTACADA</span></div>
    <div className="tupa-featured-info">
     <span className="tupa-featured-kicker"><MapPin size={14}/> FRANCIA · ALSACIA</span>
     <h3>Colmar y Alsacia</h3><p>Pueblos de cuento, canales, mercados y tradición francesa.</p>
     <div className="tupa-featured-meta"><span><CalendarDays size={18}/> 3 días sugeridos</span><span><MapPinned size={18}/> Sin coche</span></div>
     <button type="button" onClick={onColmar}>Ver itinerario <ArrowRight size={19}/></button>
    </div>
   </article>
   <div className="tupa-premium-footer-note"><Sparkles size={17}/> Diseñá recorridos a tu medida, consultá lugares y personalizá cada actividad.<span> Las rutas destacadas son ejemplos orientativos, no reservas ni paquetes contratados.</span></div>
   <div className="tupa-home-endlinks"><a href="https://tupatravel.com.ar/" target="_blank" rel="noopener noreferrer">Sitio de Tupã Travel <ArrowRight size={14}/></a><a href="https://www.instagram.com/tupatravel/" target="_blank" rel="noopener noreferrer">Instagram <ArrowRight size={14}/></a></div>
  </div>
 </section>;
}
