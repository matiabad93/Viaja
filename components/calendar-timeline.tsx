'use client';
import {Clock,AlertTriangle,CalendarClock} from 'lucide-react';
import {timing} from '../lib/agenda.ts';
import {calendarGeometry,hourLabel,PIXELS_PER_MINUTE} from '../lib/calendar-layout.ts';
import type {Activity} from '../lib/travel.ts';

export function CalendarTimeline({activities,onEdit}:{activities:Activity[];onEdit:(a:Activity)=>void}){
 const {start,end,height,slots}=calendarGeometry(activities);
 const flexible=activities.filter(a=>timing(a).start===null);
 const hours:number[]=[];for(let minute=start;minute<=end;minute+=60)hours.push(minute);
 return <section className="calendar-timeline" aria-label="Agenda por horarios">
  <div className="calendar-intro"><CalendarClock size={22}/><div><h3>Tu agenda horaria</h3><p>Cada bloque ocupa exactamente su duración propuesta. Editá un bloque para ajustar su horario; las horas no son reservas confirmadas.</p></div></div>
  {slots.length?<div className="calendar-grid" style={{height:height+12}}>
   {hours.map(minute=><div key={minute} className="calendar-hour" style={{top:(minute-start)*PIXELS_PER_MINUTE+6}}><span>{hourLabel(minute)}</span><i/></div>)}
   {slots.map(slot=><button key={slot.activity.id} className={'calendar-slot '+(slot.conflict?'calendar-slot-overlap':'')+(slot.activity.completed?' calendar-slot-done':'')} style={{top:slot.top+6,height:slot.height}} onClick={()=>onEdit(slot.activity)} aria-label={'Editar horario de '+slot.activity.title}>
     <strong>{hourLabel(slot.start)}–{hourLabel(slot.end)}</strong><span>{slot.activity.title}</span>{slot.activity.location&&slot.height>=84&&<small>{slot.activity.location}</small>}{slot.conflict&&slot.height>=90&&<em><AlertTriangle size={12}/> Se superpone</em>}
    </button>)}
  </div>:<div className="surface calendar-empty"><Clock size={25}/><p>Todavía no hay actividades con hora definida. Editá una actividad para organizar la agenda.</p></div>}
  {flexible.length>0&&<div className="surface calendar-flexible"><h3>Actividades sin horario</h3><p>Asignales una hora para verlas en el calendario.</p>{flexible.map(a=><button key={a.id} onClick={()=>onEdit(a)}><Clock size={15}/><span>{a.title}</span><small>Asignar hora</small></button>)}</div>}
 </section>;
}
