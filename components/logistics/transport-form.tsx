'use client';
import {useId,useState} from 'react';
import {Info,Save,X} from 'lucide-react';
import {newId,type TransportSegment} from '../../lib/travel';
import {tripDateWarning,validateTransport} from '../../lib/trip-logistics';
export type TransportFormProps={value?:TransportSegment;tripStart:string;tripEnd:string;onSave:(value:TransportSegment)=>void;onCancel:()=>void};
const initial=():TransportSegment=>({id:newId(),kind:'flight',company:'',serviceNumber:'',origin:'',destination:'',departureAt:'',arrivalAt:'',departureTimezone:'',arrivalTimezone:'',bookingReference:'',bookingUrl:'',terminal:'',notes:'',status:'planned'});
export function TransportForm({value,tripStart,tripEnd,onSave,onCancel}:TransportFormProps){
 const [draft,setDraft]=useState<TransportSegment>(()=>value?{...value}:initial()),[errors,setErrors]=useState<string[]>([]);
 const zones=useId();
 const set=<K extends keyof TransportSegment,>(key:K,v:TransportSegment[K])=>{setDraft(d=>({...d,[key]:v}));setErrors([])};
 const submit=(e:React.FormEvent)=>{e.preventDefault();const problems=validateTransport(draft);if(problems.length){setErrors(problems);return}onSave({...draft,origin:draft.origin.trim(),destination:draft.destination.trim(),updatedAt:new Date().toISOString()})};
 const warning=tripDateWarning(draft.departureAt.slice(0,10),draft.arrivalAt.slice(0,10),tripStart,tripEnd);
 return <form className="logistics-form" aria-label={value?'Editar transporte':'Nuevo transporte'} onSubmit={submit}>
 <div className="section-heading compact"><div><h3>{value?'Editar transporte':'Agregar transporte'}</h3><p className="subtle">Cada tramo tiene su propia hora y zona horaria local.</p></div><button className="iconbtn" type="button" onClick={onCancel} aria-label="Cerrar formulario"><X size={19}/></button></div>
 <div className="logistics-form-grid">
  <label>Tipo<select value={draft.kind} onChange={e=>set('kind',e.target.value as TransportSegment['kind'])}><option value="flight">Vuelo</option><option value="train">Tren</option><option value="bus">Autobús</option><option value="ferry">Ferry</option><option value="transfer">Traslado</option><option value="rental_car">Coche de alquiler</option><option value="other">Otro</option></select></label>
  <label>Estado<select value={draft.status} onChange={e=>set('status',e.target.value as TransportSegment['status'])}><option value="planned">Planificado</option><option value="confirmed">Confirmado por mí</option><option value="cancelled">Cancelado</option></select></label>
  <label>Compañía (opcional)<input maxLength={130} placeholder="Vueling, SNCF…" value={draft.company||''} onChange={e=>set('company',e.target.value)}/></label>
  <label>Número de servicio (opcional)<input maxLength={70} placeholder="VY1234, TGV…" value={draft.serviceNumber||''} onChange={e=>set('serviceNumber',e.target.value)}/></label>
  <label>Origen<input required maxLength={160} placeholder="Barcelona-El Prat" value={draft.origin} onChange={e=>set('origin',e.target.value)}/></label>
  <label>Destino<input required maxLength={160} placeholder="EuroAirport Basilea" value={draft.destination} onChange={e=>set('destination',e.target.value)}/></label>
  <label>Salida (hora local)<input type="datetime-local" required value={draft.departureAt} onChange={e=>set('departureAt',e.target.value)}/></label>
  <label>Llegada (hora local)<input type="datetime-local" required value={draft.arrivalAt} onChange={e=>set('arrivalAt',e.target.value)}/></label>
  <label>Zona horaria de salida<input required list={zones} value={draft.departureTimezone} placeholder="Europe/Madrid" onChange={e=>set('departureTimezone',e.target.value)}/></label>
  <label>Zona horaria de llegada<input required list={zones} value={draft.arrivalTimezone} placeholder="Europe/Paris" onChange={e=>set('arrivalTimezone',e.target.value)}/></label>
  <datalist id={zones}>{['Europe/Madrid','Europe/Paris','Europe/London','Europe/Rome','Europe/Zurich','America/Argentina/Buenos_Aires','America/New_York','America/Sao_Paulo','Asia/Tokyo'].map(x=><option key={x} value={x}/>)}</datalist>
  <label>Terminal o estación (opcional)<input maxLength={120} value={draft.terminal||''} onChange={e=>set('terminal',e.target.value)}/></label>
  <label>Localizador privado (opcional)<input maxLength={100} value={draft.bookingReference||''} onChange={e=>set('bookingReference',e.target.value)}/></label>
  <label className="full">URL HTTPS de reserva (opcional)<input type="url" placeholder="https://" value={draft.bookingUrl||''} onChange={e=>set('bookingUrl',e.target.value)}/></label>
  <label className="full">Notas privadas<textarea rows={3} maxLength={2000} value={draft.notes||''} onChange={e=>set('notes',e.target.value)}/></label>
 </div>
 {warning&&<p role="status" className="logistics-warning"><Info size={17}/>{warning}</p>}
 <p className="subtle">Usá las zonas de origen y destino (ej. Europe/Madrid y Europe/London). El calendario convertirá cada hora a UTC, incluidos los cambios de horario de verano.</p>
 {!!errors.length&&<div className="logistics-errors" role="alert">{errors.map((e,i)=><p key={i}>{e}</p>)}</div>}
 <div className="logistics-form-actions"><button type="button" className="secondary" onClick={onCancel}>Cancelar</button><button className="primary" type="submit"><Save size={17}/>Guardar transporte</button></div>
 </form>
}
