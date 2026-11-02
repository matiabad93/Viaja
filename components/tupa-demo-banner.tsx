'use client';
import {ArrowUpRight,Compass,Instagram,ShieldCheck,Sparkles} from 'lucide-react';

/** Private branded proposal, not a live reservation or official agency website. */
export function TupaDemoBanner({onPlan}:{onPlan:()=>void}){
 return <section className="tupa-presentation" aria-label="Propuesta personalizada para Tupã Travel">
  <div className="tupa-badge"><span className="tupa-badge-line"/> EDICIÓN DE PRUEBA · TUPÃ TRAVEL <span className="tupa-badge-line"/></div>
  <div className="tupa-presentation-main">
   <img className="tupa-presentation-logo" src="/tupa-travel-logo.svg" alt="Identidad visual de Tupã Travel" width={144} height={155}/>
   <div className="tupa-presentation-copy">
    <p className="tupa-kicker">UNA NUEVA FORMA DE ACOMPAÑAR CADA VIAJE</p>
    <h2>Tu próximo destino, <em>con un plan a tu medida.</em></h2>
    <p>Imaginá una experiencia donde tus viajeros pueden descubrir lugares, organizar cada día, comparar opciones y guardar su itinerario, con la identidad de Tupã Travel.</p>
    <div className="tupa-presentation-actions">
     <button type="button" className="tupa-action-primary" onClick={onPlan}><Compass size={17}/> Crear un viaje de prueba</button>
     <a href="https://tupatravel.com.ar/" target="_blank" rel="noopener noreferrer" className="tupa-action-secondary">Sitio de Tupã Travel <ArrowUpRight size={16}/></a>
     <a href="https://www.instagram.com/tupatravel/" target="_blank" rel="noopener noreferrer" className="tupa-action-secondary"><Instagram size={16}/> Instagram</a>
    </div>
   </div>
  </div>
  <div className="tupa-presentation-bottom">
   <span><Sparkles size={15}/> Itinerarios editables · Calendario · Gastos · Mapas</span>
   <span><ShieldCheck size={15}/> Datos de prueba guardados solo en este navegador</span>
  </div>
  <p className="tupa-proposal-disclaimer">Propuesta tecnológica demostrativa, no el sitio oficial de la agencia. No procesa pagos, cotizaciones ni reservas. La IA y el registro de cuentas requieren una infraestructura de pruebas independiente para habilitarse.</p>
 </section>;
}
