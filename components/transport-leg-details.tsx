import {ArrowRight,BusFront,ExternalLink,TrainFront,Footprints,Info} from 'lucide-react';
import type {Activity} from '../lib/travel';
import {safeURL} from '../lib/travel';
import styles from './transport-leg-details.module.css';

/** Show a transport leg as practical boarding instructions, not hidden prose. */
export function TransportLegDetails({activity}:{activity:Activity}){
 const leg=activity.transportDetails;
 if(!leg)return <div className={styles.card} role="note"><Info size={17}/><div><strong>Cómo llegar · pendiente de detallar</strong><p>Faltan la ruta y las paradas de este traslado. Consultá el recorrido oficial antes de viajar.</p></div></div>;
 const status=activity.scheduleStatus==='verified'?'Confirmado por vos':activity.scheduleStatus==='researched'?'Fuente consultada · comprobar horario':'Horario estimado · verificar';
 const ModeIcon=/tren|train|ferro|rail/i.test(leg.mode||'')?TrainFront:/autob[uú]s|bus|lanzadera/i.test(leg.mode||'')?BusFront:Footprints;
 return <section className={styles.card} aria-label={'Cómo llegar: '+activity.title}>
  <div className={styles.heading}><ModeIcon size={18}/><strong>Cómo llegar</strong><small>{status}</small></div>
  {(leg.from||leg.to)&&<div className={styles.route}><span>{leg.from||'Salida por confirmar'}</span><ArrowRight size={16} aria-hidden="true"/><span>{leg.to||'Destino por confirmar'}</span></div>}
  {(leg.service||leg.mode)&&<p><strong>Medio:</strong> {[leg.mode,leg.service].filter(Boolean).join(' · ')}</p>}
  {leg.boardingStop&&<p><strong>Subir en:</strong> {leg.boardingStop}{leg.boardingTime?' · '+leg.boardingTime:''}</p>}
  {leg.arrivalStop&&<p><strong>Bajar en:</strong> {leg.arrivalStop}{leg.arrivalTime?' · '+leg.arrivalTime:''}</p>}
  {leg.verificationNote&&<p className={styles.verify}><Info size={14}/>{leg.verificationNote}</p>}
  {leg.sourceUrl&&safeURL(leg.sourceUrl)&&<a href={leg.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar fuente del trayecto <ExternalLink size={14}/></a>}
 </section>;
}
