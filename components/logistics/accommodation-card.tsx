'use client';
import {useState} from 'react';
import {BedDouble,CalendarPlus,MapPin,Copy,ExternalLink,Pencil,Trash2,Ban,Receipt,Check,Clock3} from 'lucide-react';
import type {Accommodation} from '../../lib/travel';
import {createAccommodationEvents,downloadCalendarFile} from '../../lib/calendar-export';
export type AccommodationCardProps={value:Accommodation;readOnly:boolean;onEdit:()=>void;onDelete:()=>void;onCancel:()=>void;onLinkExpense:()=>void;linkedExpense?:string;onError:(s:string)=>void};
const statusLabels={planned:'Planificado',confirmed:'Confirmado',cancelled:'Cancelado'};
export function AccommodationCard({value:a,readOnly,onEdit,onDelete,onCancel,onLinkExpense,linkedExpense,onError}:AccommodationCardProps){
 const [copied,setCopied]=useState(false),[showCode,setShowCode]=useState(false);
 const address=[a.address,a.city].filter(Boolean).join(', ');
 const copy=async()=>{try{await navigator.clipboard.writeText(address);setCopied(true)}catch{onError('No se pudo copiar la dirección.')}};
 const exportCalendar=()=>{try{downloadCalendarFile(createAccommodationEvents(a),a.name+'-alojamiento')}catch(e){onError((e as Error).message)}};
 return <article className="logistics-card accommodation-card">
  <div className="logistics-card-heading"><span className="logistics-card-icon"><BedDouble size={21}/></span><div><h4>{a.name}</h4><p>{a.city||a.kind}</p></div><span className={'logistics-status status-'+a.status}>{statusLabels[a.status]}</span></div>
  <p className="logistics-address"><MapPin size={17}/>{address}</p>
  <div className="logistics-dates"><span><Clock3 size={16}/>Entrada: <strong>{a.checkIn}{a.checkInTime?' · '+a.checkInTime:''}</strong></span><span>Salida: <strong>{a.checkOut}{a.checkOutTime?' · '+a.checkOutTime:''}</strong></span></div>
  {a.timezone&&<small className="subtle">Zona horaria: {a.timezone}</small>}
  {a.confirmationCode&&<button className="logistics-private-code" type="button" onClick={()=>setShowCode(x=>!x)} aria-pressed={showCode}>Localizador privado: {showCode?a.confirmationCode:'••••••'} · {showCode?'Ocultar':'Mostrar'}</button>}
  {a.updatedAt&&<small className="subtle">Actualizado: {new Date(a.updatedAt).toLocaleDateString('es-ES')}</small>}
  {linkedExpense&&<p className="logistics-linked"><Receipt size={15}/>Gasto vinculado: {linkedExpense}</p>}
  <div className="logistics-card-actions">
   <button className="secondary" type="button" onClick={()=>void copy()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar dirección'}</button>
   <a href={'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:address})} target="_blank" rel="noopener noreferrer"><MapPin size={16}/>Google Maps</a>
   <a href={'https://maps.apple.com/?'+new URLSearchParams({q:address})} target="_blank" rel="noopener noreferrer"><MapPin size={16}/>Apple Maps</a>
   {a.bookingUrl&&<a href={a.bookingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Ver reserva</a>}
   {a.status!=='cancelled'&&<button type="button" className="secondary" onClick={exportCalendar}><CalendarPlus size={16}/>Calendario</button>}
   {!readOnly&&<><button type="button" className="secondary" onClick={onLinkExpense}><Receipt size={16}/>Vincular gasto</button><button type="button" className="secondary" onClick={onEdit}><Pencil size={16}/>Editar</button>{a.status!=='cancelled'&&<button type="button" className="secondary" onClick={onCancel}><Ban size={16}/>Cancelar reserva</button>}<button type="button" className="iconbtn" aria-label={'Eliminar alojamiento '+a.name} onClick={onDelete}><Trash2 size={17}/></button></>}
  </div>
 </article>;
}
