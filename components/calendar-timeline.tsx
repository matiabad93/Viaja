'use client';
import {Clock,AlertTriangle,CalendarClock} from 'lucide-react';
import {timing,overlaps} from '../lib/agenda.ts';
import type {Activity} from '../lib/travel.ts';

export function CalendarTimeline({activities,onEdit}:{activities:Activity[];onEdit:(a:Activity)=>void}){
 const scheduled=activities.filter(a=>timing(a).start!==null).sort((a,b)=>timing(a).start!-timing(b).start!);
 const flexible=activities.filter(a=>timing(a).start===null);
 const start=Math.min(8*60,...scheduled.map(a=>timing(a).start!));
 const stop=Math.max(21*60,...scheduled.map(a=>timing(a).end??timing(a).start!+45));
 const hours:number[]=[];for(let m=Math.floor(start/60)*60;m<=stop;m+=60)hours.push(m);
 const label=(m:number)=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
 return <section className="calendar-timeline" aria-label="Agenda por horarios">
  <div className="calendar-intro"><CalendarClock size={22}/><div><h3>Tu agenda horaria</h3><p>Organizá el día por horas, detectá cruces y descubrí espacios libres. Los horarios propuestos no son reservas confirmadas.</p></div></div>
  {scheduled.length?<div className="calendar-grid" style={{height:Math.max(500,(stop-start)/60*66)}}>
   {hours.map(m=><div key={m} className="calendar-hour" style={{top:((m-start)/(stop-start)*100)+'%'}}><span>{label(m)}</span><i/></div>)}
   {scheduled.map(a=>{
    const t=timing(a),s=t.start!,end=Math.max(s+20,t.end??s+45),conflict=overlaps(a,activities);
    return <button key={a.id} className={'calendar-slot '+(conflict?'calendar-slot-overlap':'')+(a.completed?' calendar-slot-done':'')} style={{top:((s-start)/(stop-start)*100)+'%',height:Math.max(44,(end-s)/(stop-start)*100*Math.max(500,(stop-start)/60*66))+'px'}} onClick={()=>onEdit(a)} aria-label={'Editar horario de '+a.title}>
     <strong>{label(s)}–{label(Math.min(end,1439))}</strong><span>{a.title}</span>{a.location&&<small>{a.location}</small>}{conflict&&<em><AlertTriangle size={12}/> Se superpone</em>}
    </button>
   })}
  </div>:<div className="surface calendar-empty"><Clock size={25}/><p>Todavía no hay actividades con hora definida. Editá una actividad para organizar la agenda.</p></div>}
  {flexible.length>0&&<div className="surface calendar-flexible"><h3>Actividades sin horario</h3><p>Estas ideas no están ubicadas en la agenda. Asignales una hora para verlas en el calendario.</p>{flexible.map(a=><button key={a.id} onClick={()=>onEdit(a)}><Clock size={15}/><span>{a.title}</span><small>Asignar hora</small></button>)}</div>}
 </section>;
}
