'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {calendarDays,dateFromISO,formattedDate,isoFromDate,normalizeTripDates,todayLocal} from '../lib/date-range';

type Step='start'|'end';
export function TripDateRange({start,end,onChange,minStart,compact=false}:{
 start:string;end:string;onChange:(next:{start:string;end:string})=>void;
 minStart?:string;compact?:boolean;
}){
 const [step,setStep]=useState<Step|null>(null);
 const [month,setMonth]=useState(()=>{const d=start?dateFromISO(start):new Date();return new Date(d.getFullYear(),d.getMonth(),1,12)});
 const host=useRef<HTMLDivElement>(null),startButton=useRef<HTMLButtonElement>(null),endButton=useRef<HTMLButtonElement>(null);
 const id=useId();
 const earliest=minStart||'';
 const open=(selected:Step)=>{
  const basis=selected==='end'?(end||start):start;
  const date=basis?dateFromISO(basis):new Date();
  setMonth(new Date(date.getFullYear(),date.getMonth(),1,12));setStep(selected);
 };
 useEffect(()=>{
  if(!step)return;
  const closeOutside=(event:PointerEvent)=>{if(host.current&&!host.current.contains(event.target as Node))setStep(null)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setStep(null);(step==='start'?startButton:endButton).current?.focus()}};
  document.addEventListener('pointerdown',closeOutside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',escape)};
 },[step]);
 const select=(date:string)=>{
  if(step==='start'){
   if(earliest&&date<earliest)return;
   onChange(normalizeTripDates(date,end));
   setStep('end');
   endButton.current?.focus();
   return;
  }
  if(!start){onChange({start:date,end:''});setStep('end');return}
  if(date<start)return;
  onChange({start,end:date});
  setStep(null);
  endButton.current?.focus();
 };
 const dates=calendarDays(month.getFullYear(),month.getMonth());
 const monthName=month.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
 const previous=()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1,12));
 const next=()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1,12));
 return <div ref={host} className={'trip-date-range'+(compact?' compact':'')}>
  <div className="trip-date-fields">
   <div className="trip-date-field"><span className="trip-date-label">Salida</span><button ref={startButton} aria-label="Fecha de salida" aria-haspopup="dialog" aria-expanded={step==='start'} type="button" onClick={()=>open('start')} className={step==='start'?'date-trigger active':'date-trigger'}><CalendarDays size={17}/><span>{formattedDate(start)}</span></button></div>
   <div className="trip-date-field"><span className="trip-date-label">Regreso</span><button ref={endButton} aria-label="Fecha de regreso" aria-haspopup="dialog" aria-expanded={step==='end'} type="button" onClick={()=>open('end')} className={step==='end'?'date-trigger active':'date-trigger'}><CalendarDays size={17}/><span>{formattedDate(end)}</span></button></div>
  </div>
  {step&&<div role="dialog" aria-modal="false" aria-label={step==='start'?'Elegir fecha de salida':'Elegir fecha de regreso'} id={id} className="trip-calendar-popover">
   <div className="trip-calendar-top"><div><strong>{step==='start'?'¿Cuándo salís?':'¿Cuándo regresás?'}</strong><small>{step==='start'?'Elegí la salida. Después, el regreso.':'Elegí una fecha igual o posterior a la salida.'}</small></div><button type="button" className="calendar-close" onClick={()=>setStep(null)} aria-label="Cerrar calendario"><X size={18}/></button></div>
   <div className="trip-calendar-month"><button type="button" onClick={previous} aria-label="Mes anterior"><ChevronLeft size={20}/></button><strong>{monthName}</strong><button type="button" onClick={next} aria-label="Mes siguiente"><ChevronRight size={20}/></button></div>
   <div className="trip-calendar-days" role="group" aria-label={monthName}>
    {['L','M','X','J','V','S','D'].map((day,i)=><span className="weekday" key={i} aria-hidden="true">{day}</span>)}
    {dates.map(date=>{
     const d=dateFromISO(date);
     const out=d.getMonth()!==month.getMonth();
     const disabled=step==='start'?(!!earliest&&date<earliest):(date<(start||earliest));
     const chosen=date===start||date===end;
     const between=!!start&&!!end&&date>start&&date<end;
     const label=d.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
     return <button key={date} data-date={date} type="button" disabled={disabled} aria-label={label} aria-pressed={chosen} onClick={()=>select(date)} className={'calendar-day'+(out?' other-month':'')+(chosen?' chosen':'')+(between?' between':'')+(date===todayLocal()?' today':'')}>{d.getDate()}</button>
    })}
   </div>
   <p className="trip-calendar-hint">{step==='end'&&start?'Salida: '+formattedDate(start)+'. Seleccioná el regreso para cerrar el calendario.':'Seleccioná una fecha para continuar.'}</p>
  </div>}
 </div>
}
