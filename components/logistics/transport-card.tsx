'use client';
import {useState} from 'react';
import {CalendarPlus,Plane,TrainFront,Bus,Ferry,Car,MapPin,Pencil,Trash2,Receipt,ExternalLink,Ban} from 'lucide-react';
import type {TransportSegment} from '../../lib/travel';
import {createTransportEvent,downloadCalendarFile} from '../../lib/calendar-export';
const names:Record<TransportSegment['kind'],string>={flight:'Vuelo',train:'Tren',bus:'Autobús',ferry:'Ferry',transfer:'Traslado',rental_car:'Coche de alquiler',other:'Transporte'};
type Props={value:TransportSegment;readOnly:boolean;onEdit:()=>void;onDelete:()=>void;onCancel:()=>void;onLinkExpense:()=>void;linkedExpense?:string;onError:(s:string)=>void};
export function TransportCard({value:t,readOnly,onEdit,onDelete,onCancel,onLinkExpense,linkedExpense,onError}:Props){
 const [showCode,setShowCode]=useState(false);
 const exportCalendar=()=>{try{downloadCalendarFile([createTransportEvent(t)],t.origin+'-'+t.destination)}catch(e){onError((e as Error).message)}};
 const Icon=t.kind==='flight'?Plane:t.kind==='train'?TrainFront:t.kind==='bus'?Bus:t.kind==='ferry'?Ferry:t.kind==='rental_car'?Car:MapPin;
 const format=(s:string)=>s?new Date(s+':00').toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Por definir';
 return <article className="logistics-card transport-card">
  <div className="logistics-card-heading"><span className="logistics-card-icon"><Icon size={21}/></span><div><p className="logistics-type">{names[t.kind]}{t.company?' · '+t.company:''}{t.serviceNumber?' · '+t.serviceNumber:''}</p><h4>{t.origin} → {t.destination}</h4></div><span className={'logistics-status status-'+t.status}>{t.status==='confirmed'?'Confirmado':t.status==='cancelled'?'Cancelado':'Planificado'}</span></div>
  <div className="logistics-route"><div><small>Salida · {t.departureTimezone}</small><strong>{format(t.departureAt)}</strong></div><span className="logistics-route-line" aria-hidden="true">→</span><div><small>Llegada · {t.arrivalTimezone}</small><strong>{format(t.arrivalAt)}</strong></div></div>
  {t.terminal&&<p className="subtle">Terminal o estación: {t.terminal}</p>}
  {t.bookingReference&&<button className="logistics-private-code" type="button" aria-pressed={showCode} onClick={()=>setShowCode(x=>!x)}>Localizador privado: {showCode?t.bookingReference:'••••••'} · {showCode?'Ocultar':'Mostrar'}</button>}
  {t.updatedAt&&<small className="subtle">Actualizado: {new Date(t.updatedAt).toLocaleDateString('es-ES')}</small>}
  {linkedExpense&&<p className="logistics-linked"><Receipt size={15}/>Gasto vinculado: {linkedExpense}</p>}
  <div className="logistics-card-actions">
   {t.bookingUrl&&<a target="_blank" rel="noopener noreferrer" href={t.bookingUrl}><ExternalLink size={16}/>Ver reserva</a>}
   {t.status!=='cancelled'&&<button className="secondary" type="button" onClick={exportCalendar}><CalendarPlus size={16}/>Calendario</button>}
   {!readOnly&&<><button className="secondary" type="button" onClick={onLinkExpense}><Receipt size={16}/>Vincular gasto</button><button className="secondary" type="button" onClick={onEdit}><Pencil size={16}/>Editar</button>{t.status!=='cancelled'&&<button type="button" className="secondary" onClick={onCancel}><Ban size={16}/>Cancelar reserva</button>}<button className="iconbtn" type="button" onClick={onDelete} aria-label={'Eliminar transporte '+t.origin+' a '+t.destination}><Trash2 size={17}/></button></>}
  </div>
 </article>;
}
