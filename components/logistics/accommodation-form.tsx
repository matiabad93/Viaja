'use client';
import {useId,useState} from 'react';
import {Save,X,Info} from 'lucide-react';
import {newId,type Accommodation} from '../../lib/travel';
import {tripDateWarning,validateAccommodation} from '../../lib/trip-logistics';

export type AccommodationFormProps={value?:Accommodation;tripStart:string;tripEnd:string;onSave:(value:Accommodation)=>void;onCancel:()=>void};
const initial=():Accommodation=>({id:newId(),name:'',kind:'hotel',address:'',city:'',checkIn:'',checkOut:'',checkInTime:'',checkOutTime:'',timezone:'',provider:'',confirmationCode:'',bookingUrl:'',phone:'',notes:'',status:'planned'});
export function AccommodationForm({value,tripStart,tripEnd,onSave,onCancel}:AccommodationFormProps){
 const [draft,setDraft]=useState<Accommodation>(()=>value?{...value}:initial()),[errors,setErrors]=useState<string[]>([]);
 const tzList=useId();
 const set=<K extends keyof Accommodation,>(key:K,v:Accommodation[K])=>{setDraft(d=>({...d,[key]:v}));setErrors([])};
 const submit=(e:React.FormEvent)=>{e.preventDefault();const problems=validateAccommodation(draft);if(problems.length){setErrors(problems);return}onSave({...draft,name:draft.name.trim(),address:draft.address.trim(),updatedAt:new Date().toISOString()})};
 const warning=tripDateWarning(draft.checkIn,draft.checkOut,tripStart,tripEnd);
 return <form className="logistics-form" aria-label={value?'Editar alojamiento':'Nuevo alojamiento'} onSubmit={submit}>
  <div className="section-heading compact"><div><h3>{value?'Editar alojamiento':'Agregar alojamiento'}</h3><p className="subtle">Guardá los datos reales; la IA no confirma reservas.</p></div><button type="button" className="iconbtn" onClick={onCancel} aria-label="Cerrar formulario"><X size={19}/></button></div>
  <div className="logistics-form-grid">
   <label className="full">Nombre del alojamiento<input autoFocus required maxLength={160} placeholder="Hotel, apartamento o Airbnb" value={draft.name} onChange={e=>set('name',e.target.value)}/></label>
   <label>Tipo<select value={draft.kind} onChange={e=>set('kind',e.target.value as Accommodation['kind'])}><option value="hotel">Hotel</option><option value="apartment">Apartamento</option><option value="airbnb">Airbnb</option><option value="hostel">Hostel</option><option value="other">Otro</option></select></label>
   <label>Estado<select value={draft.status} onChange={e=>set('status',e.target.value as Accommodation['status'])}><option value="planned">Planificado</option><option value="confirmed">Confirmado por mí</option><option value="cancelled">Cancelado</option></select></label>
   <label className="full">Dirección<input required maxLength={240} placeholder="Calle, número y ciudad" value={draft.address} onChange={e=>set('address',e.target.value)}/></label>
   <label>Ciudad (opcional)<input maxLength={100} value={draft.city||''} onChange={e=>set('city',e.target.value)}/></label>
   <label>Zona horaria IANA<input list={tzList} placeholder="Europe/Paris" value={draft.timezone||''} onChange={e=>set('timezone',e.target.value)}/></label>
   <datalist id={tzList}>{['Europe/Madrid','Europe/Paris','Europe/London','Europe/Rome','America/Argentina/Buenos_Aires','America/New_York','America/Sao_Paulo','Asia/Tokyo'].map(x=><option key={x} value={x}/>)}</datalist>
   <label>Check-in<input required type="date" value={draft.checkIn} onChange={e=>set('checkIn',e.target.value)}/></label>
   <label>Check-out<input required type="date" value={draft.checkOut} min={draft.checkIn||undefined} onChange={e=>set('checkOut',e.target.value)}/></label>
   <label>Hora de entrada (opcional)<input type="time" value={draft.checkInTime||''} onChange={e=>set('checkInTime',e.target.value)}/></label>
   <label>Hora de salida (opcional)<input type="time" value={draft.checkOutTime||''} onChange={e=>set('checkOutTime',e.target.value)}/></label>
  </div>
  {warning&&<p className="logistics-warning" role="status"><Info size={17}/>{warning}</p>}
  <details className="logistics-optional"><summary>Datos opcionales de reserva</summary><div className="logistics-form-grid">
   <label>Proveedor<input value={draft.provider||''} maxLength={120} placeholder="Booking, Airbnb…" onChange={e=>set('provider',e.target.value)}/></label>
   <label>Código de reserva (privado)<input value={draft.confirmationCode||''} maxLength={100} onChange={e=>set('confirmationCode',e.target.value)}/></label>
   <label className="full">Enlace HTTPS de reserva<input type="url" placeholder="https://" value={draft.bookingUrl||''} onChange={e=>set('bookingUrl',e.target.value)}/></label>
   <label>Teléfono<input type="tel" maxLength={60} value={draft.phone||''} onChange={e=>set('phone',e.target.value)}/></label>
   <label>Importe (opcional)<input type="number" min="0" step=".01" value={draft.amount??''} onChange={e=>set('amount',e.target.value===''?undefined:Number(e.target.value))}/></label>
   <label>Moneda<input value={draft.currency||'EUR'} maxLength={3} onChange={e=>set('currency',e.target.value.toUpperCase())}/></label>
   <label className="full">Notas privadas<textarea rows={3} maxLength={2000} value={draft.notes||''} onChange={e=>set('notes',e.target.value)}/></label>
  </div></details>
  {!!errors.length&&<div className="logistics-errors" role="alert">{errors.map((e,i)=><p key={i}>{e}</p>)}</div>}
  <div className="logistics-form-actions"><button className="secondary" type="button" onClick={onCancel}>Cancelar</button><button className="primary" type="submit"><Save size={17}/>Guardar alojamiento</button></div>
 </form>
}
