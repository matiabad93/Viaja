'use client';
import {useState} from 'react';
import {FileCheck2,Save,Plus,Trash2,X,Plane,Hotel,Info} from 'lucide-react';
import type {Plan} from '../../lib/travel';
import {
 emptyReservationDetails,sanitizeReservationDetails,
 type ReservationFile,type ReservationDetails,type ReservationKind,type ReservationChanges,type ExtractedFlight
} from '../../lib/reservation-library';

export function ReservationEditor({
 record,proposal,plans,onSave,onCancel,busy=false
}:{
 record:ReservationFile;proposal?:{kind:ReservationKind;title:string;details:ReservationDetails};
 plans:Plan[];onSave:(value:ReservationChanges)=>Promise<void>;onCancel:()=>void;busy?:boolean;
}){
 const [kind,setKind]=useState<ReservationKind>(proposal?.kind||record.kind);
 const [title,setTitle]=useState(proposal?.title||record.title||record.filename);
 const [linkedTrip,setLinkedTrip]=useState(record.linked_trip_id||'');
 const [details,setDetails]=useState<ReservationDetails>(()=>sanitizeReservationDetails(proposal?.details||record.details||emptyReservationDetails()));
 const [error,setError]=useState('');
 const set=<K extends keyof ReservationDetails,>(key:K,value:ReservationDetails[K])=>
  setDetails(prev=>({...prev,[key]:value}));
 const editFlight=<K extends keyof ExtractedFlight,>(index:number,key:K,value:ExtractedFlight[K])=>{
  setDetails(prev=>({...prev,flights:prev.flights.map((f,i)=>i===index?{...f,[key]:value}:f)}));
 };
 const newFlight=()=>setDetails(prev=>({
  ...prev,flights:[...prev.flights,{company:'',serviceNumber:'',origin:'',destination:'',
   departureAt:'',arrivalAt:'',departureTimezone:'',arrivalTimezone:''}]
 }));
 const editHotel=(key:keyof NonNullable<ReservationDetails['lodging']>,value:string)=>{
  setDetails(prev=>({...prev,lodging:{...(prev.lodging||{name:'',address:'',city:'',checkIn:'',checkOut:'',provider:''}),[key]:value}}));
 };
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();setError('');
  if(!title.trim()){setError('Elegí un nombre para identificar la reserva.');return}
  try{await onSave({kind,title:title.trim().slice(0,180),details:sanitizeReservationDetails(details),
   linked_trip_id:linkedTrip||null,reviewed_at:new Date().toISOString()})}
  catch(e){setError((e as Error).message)}
 };
 const eligible=plans.filter(p=>Boolean(p.collaboration?.version)&&p.collaboration?.role!=='viewer');
 const row=(label:string,value:string,change:(value:string)=>void,placeholder='',type:'text'|'date'|'datetime-local'='text')=>
  <label>{label}<input type={type} value={value} placeholder={placeholder} onChange={e=>change(e.target.value)}/></label>;
 return <form className="reservation-editor" aria-label={'Revisar reserva '+record.filename} onSubmit={e=>void save(e)}>
  <div className="reservation-editor-title">
   <div><span className="eyebrow">REVISIÓN HUMANA</span><h3>{proposal?'Revisá los datos sugeridos':'Editar reserva'}</h3><p>Corregí los datos antes de guardarlos. El PDF original no cambia.</p></div>
   <button type="button" className="iconbtn" onClick={onCancel} aria-label="Cerrar editor" disabled={busy}><X size={18}/></button>
  </div>
  {proposal&&<p className="reservation-review-notice" role="status"><Info size={17}/>Los datos fueron extraídos por IA y pueden contener errores. Comprobá fechas, horarios y localizador con el PDF original.</p>}
  <div className="reservation-editor-grid">
   {row('Nombre visible',title,setTitle,'Mi vuelo o mi alojamiento')}
   <label>Tipo de reserva<select value={kind} onChange={e=>setKind(e.target.value as ReservationKind)}>
    <option value="unclassified">Por clasificar</option><option value="flight">Vuelo</option>
    <option value="accommodation">Alojamiento</option><option value="mixed">Varias reservas</option>
    <option value="other">Otro billete / comprobante</option>
   </select></label>
   {row('Proveedor / compañía',details.provider,value=>set('provider',value),'Vueling, Booking...')}
   {row('Localizador privado',details.bookingReference,value=>set('bookingReference',value),'Código de reserva')}
   <label className="reservation-wide">Vincular con un viaje (opcional)<select value={linkedTrip} onChange={e=>setLinkedTrip(e.target.value)}>
    <option value="">Sin viaje asociado</option>
    {eligible.map(p=><option key={p.id} value={p.id}>{p.trip.destination} · {p.trip.start||'Sin fechas'}</option>)}
   </select></label>
  </div>
  {(kind==='flight'||kind==='mixed'||details.flights.length>0)&&<section className="reservation-detail-block">
   <div className="reservation-detail-heading"><h4><Plane size={18}/>Tramos de vuelo</h4>
    <button type="button" className="secondary" onClick={newFlight} disabled={busy||details.flights.length>=8}><Plus size={16}/>Agregar tramo</button></div>
   {details.flights.length===0&&<p className="subtle">Todavía no hay vuelos registrados. Podés agregarlos manualmente.</p>}
   {details.flights.map((f,i)=><div className="reservation-flight-fields" key={i}>
    <div className="reservation-flight-title"><strong>Tramo {i+1}</strong><button type="button" className="iconbtn" aria-label={'Eliminar tramo '+(i+1)} onClick={()=>setDetails(prev=>({...prev,flights:prev.flights.filter((_,index)=>index!==i)}))}><Trash2 size={16}/></button></div>
    <div className="reservation-editor-grid">
     {row('Aerolínea',f.company,v=>editFlight(i,'company',v))}
     {row('N.º de vuelo',f.serviceNumber,v=>editFlight(i,'serviceNumber',v))}
     {row('Origen',f.origin,v=>editFlight(i,'origin',v))}
     {row('Destino',f.destination,v=>editFlight(i,'destination',v))}
     {row('Salida local',f.departureAt,v=>editFlight(i,'departureAt',v),'','datetime-local')}
     {row('Llegada local',f.arrivalAt,v=>editFlight(i,'arrivalAt',v),'','datetime-local')}
     {row('Zona horaria salida (si se conoce)',f.departureTimezone,v=>editFlight(i,'departureTimezone',v),'Europe/Madrid')}
     {row('Zona horaria llegada (si se conoce)',f.arrivalTimezone,v=>editFlight(i,'arrivalTimezone',v),'Europe/Paris')}
    </div>
   </div>)}
  </section>}
  {(kind==='accommodation'||kind==='mixed'||details.lodging!==null)&&<section className="reservation-detail-block">
   <div className="reservation-detail-heading"><h4><Hotel size={18}/>Alojamiento</h4>
    {details.lodging&&<button type="button" className="secondary" onClick={()=>set('lodging',null)}><Trash2 size={15}/>Quitar datos</button>}
   </div>
   {!details.lodging?<button type="button" className="secondary" onClick={()=>set('lodging',{name:'',address:'',city:'',checkIn:'',checkOut:'',provider:''})}><Plus size={16}/>Agregar alojamiento</button>:
   <div className="reservation-editor-grid">
    {row('Nombre del alojamiento',details.lodging.name,v=>editHotel('name',v))}
    {row('Proveedor',details.lodging.provider,v=>editHotel('provider',v))}
    {row('Dirección',details.lodging.address,v=>editHotel('address',v))}
    {row('Ciudad',details.lodging.city,v=>editHotel('city',v))}
    {row('Check-in',details.lodging.checkIn,v=>editHotel('checkIn',v),'','date')}
    {row('Check-out',details.lodging.checkOut,v=>editHotel('checkOut',v),'','date')}
   </div>}
  </section>}
  {details.warnings.length>0&&<div className="reservation-warnings"><strong>Datos que requieren comprobación</strong>{details.warnings.map((w,i)=><p key={i}>{w}</p>)}</div>}
  {error&&<p role="alert" className="documents-error">{error}</p>}
  <div className="reservation-editor-actions"><button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
   <button type="submit" className="primary" disabled={busy}><Save size={17}/>{busy?'Guardando…':'Confirmar y guardar datos'}</button></div>
  <p className="reservation-privacy-footnote"><FileCheck2 size={16}/>El archivo original permanece privado y separado del itinerario público.</p>
 </form>;
}
