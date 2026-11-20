'use client';

import type {FormEventHandler} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,Clock3,Compass,LoaderCircle,MapPin,RotateCcw,ShieldCheck,Sparkles,Users,Wallet} from 'lucide-react';
import type {Plan,Trip} from '../../lib/travel';
import {itineraryOf} from '../../lib/travel';
import {agendaSummary} from '../../lib/activity-agenda';
import {CharacterCounter} from '../character-counter';
import {AIActionFeedback} from './ai-action-feedback';

type Props={
 plan:Plan;
 trip:Trip;
 busy:boolean;
 aiReady:boolean|null;
 statusError:boolean;
 aiMode:string;
 aiError:string;
 onChange:(field:'adjustment'|'pace'|'transport'|'notes',value:string)=>void;
 onSubmit:FormEventHandler<HTMLFormElement>;
 onBack:()=>void;
 onRefresh:()=>void;
 onCancel:()=>void;
};

const suggestions=[
 {label:'Ordenar horarios',text:'Reorganizá las actividades por horario, sin superposiciones, y considerá los tiempos de traslado.'},
 {label:'Detallar transportes',text:'Investigá los trenes, autobuses y conexiones para cada día. Indicá cuándo salir, dónde subir y bajar, y el tiempo a pie hasta las visitas. Marcá lo no confirmado.'},
 {label:'Optimizar recorridos',text:'Agrupá las actividades cercanas, evitá traslados innecesarios y mantené las reservas confirmadas.'},
 {label:'Mejorar cada día',text:'Revisá el itinerario y las descripciones de cada día para aprovechar mejor el tiempo, sin duplicar actividades.'}
];

export function AIRefinementWorkspace({plan,trip,busy,aiReady,statusError,aiMode,aiError,onChange,onSubmit,onBack,onRefresh,onCancel}:Props){
 const days=itineraryOf(plan);
 const activities=days.reduce((count,day)=>count+day.activities.length,0);
 const visits=days.reduce((count,day)=>count+agendaSummary(day.activities).visit,0);
 const history=plan.refinementHistory||[];
 const dates=trip.start&&trip.end?`${trip.start} → ${trip.end}`:'Fechas por definir';
 const addSuggestion=(text:string)=>{
  const current=trip.adjustment.trim();
  const next=current?`${current}${/[.!?]$/.test(current)?' ':'; '}${text}`:text;
  if(next.length<=1000)onChange('adjustment',next);
  document.getElementById('trip-adjustment')?.focus();
 };

 return <div className="ai-refinement-page">
  <button type="button" className="ai-refinement-back" onClick={onBack}><ArrowLeft size={17}/> Volver a mi itinerario</button>
  <header className="ai-refinement-hero">
   <div>
    <span className="ai-refinement-eyebrow"><Sparkles size={15}/> EDITANDO UN VIAJE EXISTENTE</span>
    <h1>Tu viaje, <em>cada vez mejor.</em></h1>
    <p>Contale a la IA qué querés cambiar. Va a revisar tu agenda actual para reorganizar actividades, horarios y consejos del día, teniendo en cuenta tu pedido.</p>
   </div>
   <div className="ai-refinement-hero-stats" aria-label="Resumen del viaje actual"><span><CalendarDays size={16}/>{days.length} {days.length===1?'día':'días'}</span><span><Compass size={16}/>{visits} visitas · {activities} bloques</span></div>
  </header>
  <div className="ai-refinement-layout">
   <form className="ai-refinement-composer" aria-label="Mejorar el itinerario actual con IA" onSubmit={onSubmit}>
    <fieldset disabled={busy}>
     <div className="ai-refinement-composer-heading"><span className="ai-refinement-step">01</span><div><span className="eyebrow">TU PRÓXIMA MEJORA</span><h2>¿Qué ajustamos del viaje?</h2><p>Podés agregar, quitar, sustituir o mover actividades. No necesitás volver a describir todo el viaje.</p></div></div>
     <label htmlFor="trip-adjustment" className="ai-refinement-request-label">Escribí los cambios que querés hacer</label>
     <textarea id="trip-adjustment" required minLength={5} maxLength={1000} rows={6} aria-describedby="refinement-hint refinement-counter" placeholder="Ej.: El día 2 quiero visitar Eguisheim. Reorganizá los horarios y traslados sin perder las visitas importantes y actualizá los consejos de cada día." value={trip.adjustment} onChange={e=>onChange('adjustment',e.target.value)}/>
     <div id="refinement-hint" className="ai-refinement-input-hint"><CheckCircle2 size={15}/> Usaremos tu itinerario actual como punto de partida.</div>
     <CharacterCounter id="refinement-counter" value={trip.adjustment} max={1000}/>
     <div className="ai-refinement-suggestions"><span>Ideas para pedirle a la IA</span><div>{suggestions.map(s=><button type="button" key={s.label} onClick={()=>addSuggestion(s.text)}>{s.label} <ArrowRight size={14}/></button>)}</div></div>
     <details className="ai-refinement-preferences"><summary><span><span className="eyebrow">OPCIONAL</span><strong>Preferencias y notas para esta mejora</strong><small>Ritmo, transporte y detalles que la IA debe respetar</small></span><span aria-hidden="true">+</span></summary><div className="ai-refinement-preferences-fields"><label>Ritmo del viaje<select value={trip.pace} onChange={e=>onChange('pace',e.target.value)}><option>Tranquilo</option><option>Equilibrado</option><option>Intenso</option></select></label><label>Cómo te movés<select value={trip.transport} onChange={e=>onChange('transport',e.target.value)}><option>Sin coche</option><option>Con coche</option><option>Indiferente</option></select></label><label className="full">Notas del viaje<textarea rows={3} maxLength={2000} aria-describedby="ai-refinement-notes-count" value={trip.notes} onChange={e=>onChange('notes',e.target.value)}/><CharacterCounter id="ai-refinement-notes-count" value={trip.notes} max={2000}/></label></div><p>Para modificar las fechas, los viajeros o el destino principal, volvé al itinerario y elegí «Editar viaje».</p></details>
     <div className="ai-refinement-submit"><button type="submit" className="primary" disabled={aiReady!==true||!trip.start||!trip.end||trip.adjustment.trim().length<5||busy}>{busy?<LoaderCircle className="spin" size={18}/>:<Sparkles size={19}/>} {busy?'Reorganizando tu viaje…':'Aplicar mejoras al itinerario'} {!busy&&<ArrowRight size={18}/>}</button><p><ShieldCheck size={16}/> Si no se pueden aplicar cambios coherentes, conservamos tu itinerario anterior.</p></div>
     <AIActionFeedback message={aiError} refining onAdjust={()=>document.getElementById('trip-adjustment')?.focus()}/>
     {(!trip.start||!trip.end)&&<div className="ai-refinement-unavailable" role="status">Este viaje todavía no tiene fechas completas. Volvé al itinerario y usá «Editar viaje» para indicarlas antes de pedir mejoras a la IA.</div>}
     {(aiReady===false||statusError)&&<div className="ai-refinement-unavailable" role="status">La IA no está disponible en este momento. Tu viaje sigue guardado. <button type="button" onClick={onRefresh}>Comprobar conexión <RotateCcw size={14}/></button></div>}
    </fieldset>
    {busy&&<div className="ai-refinement-working" role="status"><LoaderCircle size={17} className="spin"/><span>{aiMode==='grounded_when_available'?'Buscando conexiones de transporte y organizando tu itinerario.':'Estamos preparando una nueva versión de tu itinerario.'}</span><button type="button" onClick={onCancel}>Cancelar</button></div>}
   </form>
   <aside className="ai-refinement-context" aria-label="Contexto del viaje que estás mejorando">
    <div className="ai-refinement-current"><span className="eyebrow">ESTÁS MEJORANDO ESTE VIAJE</span><h2>{trip.destination}</h2>{Boolean(trip.additionalDestinations?.length)&&<p className="ai-refinement-route"><MapPin size={15}/>{trip.additionalDestinations?.join(' · ')}</p>}<div className="ai-refinement-meta"><span><CalendarDays size={16}/>{dates}</span><span><Users size={16}/>{trip.travelers} {trip.travelers===1?'viajero':'viajeros'}</span>{trip.budget>0&&<span><Wallet size={16}/>{trip.budget} € para gastos diarios</span>}</div></div>
    <div className="ai-refinement-days"><div className="ai-refinement-days-heading"><span className="eyebrow">TU AGENDA ACTUAL</span><span>{visits} visitas · {activities} bloques</span></div><ol>{days.slice(0,4).map((day,i)=><li key={day.id}><span>{i+1}</span><div><strong>{day.title}</strong><small>{agendaSummary(day.activities).visit} visitas · {day.activities.length} bloques{day.activities[0]?' · '+day.activities[0].title:''}</small></div></li>)}</ol>{days.length>4&&<details><summary>Ver los {days.length-4} días restantes</summary><ol start={5}>{days.slice(4).map((day,i)=><li key={day.id}><span>{i+5}</span><div><strong>{day.title}</strong><small>{agendaSummary(day.activities).visit} visitas · {day.activities.length} bloques</small></div></li>)}</ol></details>}</div>
    <div className="ai-refinement-assurance"><ShieldCheck size={20}/><div><strong>Tu viaje está protegido</strong><p>Las reservas, los gastos y las actividades realizadas se conservan. La IA puede reorganizar la agenda propuesta, pero los cambios se validan antes de guardarse.</p></div></div>
    {history.length>0&&<details className="ai-refinement-history"><summary><Clock3 size={16}/> Mejoras anteriores ({history.length})</summary><ol>{history.slice(-5).reverse().map((item,i)=><li key={i}>{item.prompt}</li>)}</ol></details>}
    <button type="button" className="ai-refinement-view-trip" onClick={onBack}>Ver mi itinerario actual <ArrowRight size={16}/></button>
    <div className="ai-refinement-connection" role="status"><span className={aiReady===true?'ready':''}/>{statusError?'No se pudo comprobar la conexión':aiReady===null?'Comprobando disponibilidad de IA':aiReady?'IA disponible':'IA no disponible'}<button type="button" onClick={onRefresh} aria-label="Volver a comprobar conexión de IA"><RotateCcw size={16}/></button></div>
   </aside>
  </div>
 </div>;
}
