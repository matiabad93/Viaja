'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,Check,Clock3,Compass,MapPin,Settings2,Sparkles,Users} from 'lucide-react';
import {DestinationSearch} from './destination-search';
import {TripDateRange} from './trip-date-range';
import {TripStopsEditor} from './trip-stops-editor';
import {cityLabel} from '../lib/city-suggestions';
import {todayLocal} from '../lib/date-range';
import {daysCount,photo,type Trip} from '../lib/travel';
import {resolvedTravelPreferences,interestOptions,minimumTravelers,fixedTravelers,travelerGroupError,type InterestKey,type TravelPreferences,type DayTimeWindow,type TravelWith,type BudgetStyle} from '../lib/travel-preferences';

type Props={
 trip:Trip;onChange:(trip:Trip)=>void;onManual:()=>void;onGenerate:()=>void;
 onAdvanced:()=>void;aiReady:boolean;authenticated:boolean;busy:boolean;
 onCancel:()=>void;
};
const labels=['No me interesa','Un poco','Me gusta','Me encanta'];
const steps=['Destino','Intereses','Tu estilo','Confirmar'];
const companions:{name:TravelWith;label:string;people:number}[]=[
 {name:'Solo',label:'Solo/a',people:1},{name:'Pareja',label:'En pareja',people:2},
 {name:'Familia',label:'En familia',people:4},{name:'Amigos',label:'Con amigos',people:3}
];
const budgets:{name:BudgetStyle;hint:string}[]=[
 {name:'Económico',hint:'Priorizar planes gratuitos'},
 {name:'Intermedio',hint:'Equilibrar opciones gratuitas y de pago'},
 {name:'Cómodo',hint:'Más flexibilidad para experiencias'}
];
export function GuidedPlanner({trip,onChange,onManual,onGenerate,onAdvanced,aiReady,authenticated,busy,onCancel}:Props){
 const [step,setStep]=useState(0);
 const [notice,setNotice]=useState('');
 const [extraInterests,setExtraInterests]=useState(false);
 const [timesOpen,setTimesOpen]=useState(false);
 const pref=resolvedTravelPreferences(trip.preferences);
 // Trips originally created in advanced mode did not store a group selection.
 if(!trip.preferences&&trip.travelers>2)pref.travelWith='Amigos';
 const withDates=Boolean(trip.start||trip.end);
 const duration=withDates?daysCount(trip):pref.durationDays;
 const update=(patch:Partial<Trip>)=>onChange({...trip,...patch});
 const updatePref=(patch:Partial<TravelPreferences>)=>update({preferences:{...pref,...patch}});
 const interest=(key:InterestKey,value:number)=>updatePref({interests:{...pref.interests,[key]:value as 0|1|2|3}});
 const updateTime=(i:number,key:keyof DayTimeWindow,value:string)=>{
  const next=Array.from({length:Math.min(duration||3,31)},(_,j)=>pref.dayTimes?.[j]||{start:'10:00',end:'18:00'});
  next[i]={...next[i],[key]:value};
  updatePref({dayTimes:next});
 };
 const hasInvalidTimes=Boolean(pref.dayTimes?.some(w=>w.start>=w.end));
 const travelerError=travelerGroupError(pref.travelWith,trip.travelers);
 const validDestination=trip.destination.trim().length>=2&&
  (!withDates||Boolean(trip.start&&trip.end&&trip.end>=trip.start))&&duration>=1&&duration<=31;
 const canNext=validDestination&&!hasInvalidTimes&&(!travelerError||step<2);
 const next=()=>{if(!canNext){setNotice('Elegí un destino y fechas válidas, o seleccioná una duración.');return}
  if(hasInvalidTimes){setNotice('Revisá los horarios: cada día debe terminar después de comenzar.');return}
  setNotice('');setStep(s=>Math.min(3,s+1));
  if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'auto'});
 };
 const back=()=>{setNotice('');setStep(s=>Math.max(0,s-1));window.scrollTo({top:0,behavior:'auto'})};
 const cover=photo(trip.destination);
 const explainAI=withDates
  ?authenticated?'El asistente no está disponible ahora. Podés guardar tu viaje y completarlo más adelante.':'Para crear actividades con IA necesitás iniciar sesión. Podés guardar tu viaje sin una cuenta.'
  :'Si querés un itinerario con IA, elegí fechas exactas en el primer paso. Sin fechas podés crear tu viaje igualmente.';
 return <section className="viaja-wizard" aria-label="Nuevo planificador guiado de viajes">
  <div className="wizard-header">
   <div className="wizard-brand"><Compass size={18}/><strong>Planeá a tu ritmo</strong><span>Nuevo planificador</span></div>
   <button type="button" className="wizard-advanced" onClick={onAdvanced}><Settings2 size={17}/>Opciones avanzadas</button>
  </div>
  <div className="wizard-progress" aria-label={'Paso '+(step+1)+' de 4'}>
   {steps.map((name,i)=><div key={name} className={'wizard-progress-step'+(i===step?' active':i<step?' done':'')} aria-current={i===step?'step':undefined}>
    <span className="wizard-progress-dot">{i<step?<Check size={15}/>:i+1}</span><span className="wizard-progress-name">{name}</span>
   </div>)}
  </div>
  <div className="wizard-content">
   {cover&&<div className="wizard-cover"><img src={cover} alt={'Vista de '+trip.destination}/><span>{trip.destination}</span></div>}
   {step===0&&<>
    <div className="wizard-intro"><span className="eyebrow">PASO 1 · TU DESTINO</span><h1>¿A dónde te gustaría viajar?</h1><p>Empezá con lo importante. Podés cambiar los detalles después.</p></div>
    <label className="wizard-field">Destino principal
     <DestinationSearch ariaLabel="Destino principal" placeholder="Buscá Roma, Madrid, París..." value={trip.destination}
      onChange={value=>update({destination:value,city:undefined})}
      onSelect={city=>update({destination:cityLabel(city),city})}/>
    </label>
    <details className="wizard-more-destinations"><summary>¿Visitás más de una ciudad? (opcional)</summary>
     <TripStopsEditor trip={trip} onChange={onChange}/>
    </details>
    <div className="wizard-date-choice" role="group" aria-label="¿Tenés fechas definidas?">
     <button className={!withDates?'selected':''} type="button" aria-pressed={!withDates}
      onClick={()=>update({start:'',end:''})}>Todavía no sé las fechas</button>
     <button className={withDates?'selected':''} type="button" aria-pressed={withDates}
      onClick={()=>{if(!withDates)update({start:todayLocal(),end:todayLocal()})}}>Ya tengo fechas</button>
    </div>
    {withDates?<div className="wizard-dates"><span className="wizard-small-label">Fechas de tu viaje</span>
      <TripDateRange start={trip.start} end={trip.end} minStart={trip.start&&trip.start<todayLocal()?trip.start:todayLocal()}
       onChange={dates=>update(dates)}/></div>
     :<label className="wizard-field">¿Cuántos días pensás viajar?
      <select aria-label="Cantidad de días" value={pref.durationDays} onChange={e=>updatePref({durationDays:Number(e.target.value)})}>
       {[2,3,4,5,6,7,8,10,12,14,21,30].map(n=><option key={n} value={n}>{n} días</option>)}
      </select>
     </label>}
   </>}
   {step===1&&<>
    <div className="wizard-intro"><span className="eyebrow">PASO 2 · TUS INTERESES</span><h1>¿Qué te gusta hacer?</h1>
     <p>Mové las barras. 0 significa que no te interesa y 3 que te encanta. Podés dejar las sugerencias predeterminadas.</p></div>
    {interestOptions.map((item,i)=>i>=4&&!extraInterests?null:
     <div className="wizard-interest" key={item.id}>
      <div className="wizard-interest-title"><label htmlFor={'interest-'+item.id}>{item.label}</label><span>{labels[pref.interests[item.id]]}</span></div>
      <input type="range" id={'interest-'+item.id} min={0} max={3} step={1} value={pref.interests[item.id]}
       onChange={e=>interest(item.id,Number(e.target.value))}
       aria-valuetext={labels[pref.interests[item.id]]}/>
      <div className="wizard-interest-ends"><span>Nada</span><span>Mucho</span></div>
     </div>)}
    <button className="wizard-more-link" type="button" aria-expanded={extraInterests} onClick={()=>setExtraInterests(s=>!s)}>
     {extraInterests?'Mostrar menos intereses':'Ver más intereses (deportes, fútbol, eventos y otros)'}
    </button>
   </>}
   {step===2&&<>
    <div className="wizard-intro"><span className="eyebrow">PASO 3 · TU ESTILO</span><h1>¿Cómo te gusta viajar?</h1>
     <p>Usaremos estas respuestas para adaptar las propuestas a tu grupo.</p></div>
    <fieldset className="wizard-option-group"><legend>¿Con quién viajás?</legend><div className="wizard-cards four">
     {companions.map(item=><button key={item.name} type="button" className={'wizard-option'+(pref.travelWith===item.name?' selected':'')}
      aria-pressed={pref.travelWith===item.name}
      onClick={()=>{
       const fixed=fixedTravelers(item.name);
       const current=Number.isInteger(trip.travelers)?trip.travelers:item.people;
       const count=fixed??(pref.travelWith==='Solo'||pref.travelWith==='Pareja'?item.people:Math.max(minimumTravelers(item.name),Math.min(12,current)));
       update({travelers:count,preferences:{...pref,travelWith:item.name}});
       setNotice('');
      }}>{item.label}</button>)}
    </div></fieldset>
    {fixedTravelers(pref.travelWith)!==undefined?
      <p className="wizard-fixed-travelers" role="status"><Users size={18}/>
       {pref.travelWith==='Solo'?'1 viajero · viajás solo/a':'2 viajeros · viajás en pareja'}
      </p>:
      <label className="wizard-field">¿Cuántas personas viajan en total?
       <input type="number" min={minimumTravelers(pref.travelWith)} max={12} value={trip.travelers||''}
        onChange={e=>update({travelers:e.target.value===''?0:Number(e.target.value)})}
        aria-invalid={Boolean(travelerError)} aria-describedby={travelerError?'wizard-traveler-error':undefined}/>
      </label>}
    {travelerError&&<p id="wizard-traveler-error" className="wizard-notice" role="alert">{travelerError}</p>}
    <fieldset className="wizard-option-group"><legend>¿Qué nivel de gasto preferís?</legend><div className="wizard-cards three">
     {budgets.map(item=><button key={item.name} type="button" className={'wizard-option'+(pref.budgetStyle===item.name?' selected':'')}
      aria-pressed={pref.budgetStyle===item.name} title={item.hint}
      onClick={()=>updatePref({budgetStyle:item.name})}><strong>{item.name}</strong><small>{item.hint}</small></button>)}
    </div><p className="wizard-subtle">Es una preferencia orientativa, no un precio ni un presupuesto cerrado.</p></fieldset>
    <details className="wizard-more-destinations" open={timesOpen} onToggle={e=>setTimesOpen((e.currentTarget as HTMLDetailsElement).open)}>
     <summary><Clock3 size={17}/> Ajustar horarios disponibles por día (opcional)</summary>
     <p className="wizard-subtle">Por ejemplo, el primer día desde las 12:00 si llegás al mediodía. Sin cambios, no asumimos horarios de vuelo.</p>
     {Array.from({length:Math.min(duration||3,31)},(_,i)=>{
      const t=pref.dayTimes?.[i]||{start:'10:00',end:'18:00'};
      return <div className="wizard-time-row" key={i}><strong>Día {i+1}</strong>
       <label>Desde <input type="time" value={t.start} onChange={e=>updateTime(i,'start',e.target.value)}/></label>
       <label>Hasta <input type="time" value={t.end} onChange={e=>updateTime(i,'end',e.target.value)}/></label>
      </div>})}
     <button className="wizard-more-link" type="button" onClick={()=>updatePref({dayTimes:undefined})}>Restablecer horarios</button>
    </details>
   </>}
   {step===3&&<>
    <div className="wizard-intro"><span className="eyebrow">PASO 4 · LISTO PARA EMPEZAR</span><h1>Este es tu viaje</h1>
     <p>Revisá tus elecciones. Podrás editar todo cuando el viaje esté creado.</p></div>
    <div className="wizard-summary">
     <p><MapPin size={19}/><strong>{trip.destination}</strong></p>
     <p><CalendarDays size={19}/>{withDates?trip.start+' — '+trip.end:pref.durationDays+' días · sin fechas todavía'}</p>
     <p><Users size={19}/>{pref.travelWith} · {trip.travelers} viajeros</p>
     <p><Settings2 size={19}/>{pref.budgetStyle} · {interestOptions.filter(i=>pref.interests[i.id]===3).map(i=>i.label).join(', ')||'Intereses equilibrados'}</p>
    </div>
    <label className="wizard-field">¿Querés contarnos algo más? <small>(opcional)</small>
     <textarea rows={3} maxLength={2000} value={trip.notes}
      onChange={e=>update({notes:e.target.value})}
      placeholder="Por ejemplo: viajo con alguien que camina poco, quiero visitar el Coliseo..."/>
    </label>
    <p className="wizard-info wizard-ai-preferences"><Sparkles size={17}/>
      La IA usará tus intereses, el tipo de viaje, el presupuesto orientativo y los horarios que elegiste. Tus notas son opcionales.
    </p>
    <div className="wizard-result-actions">
     {aiReady&&withDates?<button className="primary" type="button" disabled={busy||hasInvalidTimes||Boolean(travelerError)} onClick={onGenerate}>
       <Sparkles size={18}/>{busy?'Preparando tu itinerario…':'Generar itinerario con IA'}<ArrowRight size={18}/>
      </button>:<p className="wizard-info" role="status">{explainAI}</p>}
     <button className={aiReady&&withDates?'secondary':'primary'} type="button"
      disabled={busy||hasInvalidTimes||Boolean(travelerError)} onClick={onManual}><Compass size={18}/>Crear mi viaje con guía o agenda</button>
     <p className="wizard-subtle">Para los destinos con guías editoriales, empezás con actividades sugeridas. En otros destinos podés organizar tu agenda desde cero. Las propuestas se pueden editar.</p>
     {busy&&<button type="button" className="wizard-more-link" onClick={onCancel}>Cancelar generación</button>}
    </div>
   </>}
   {notice&&<p className="wizard-notice" role="status">{notice}</p>}
  </div>
  <footer className="wizard-footer">
   <button className="secondary" type="button" disabled={step===0||busy} onClick={back}><ArrowLeft size={17}/>Volver</button>
   <span aria-live="polite">{step+1} / {steps.length}</span>
   {step<3&&<button className="primary" type="button" disabled={busy||!canNext} onClick={next}>Continuar <ArrowRight size={17}/></button>}
  </footer>
 </section>;
}
