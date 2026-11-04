'use client';
import {useEffect,useState} from 'react';
import {BedDouble,Plane,Files,CalendarPlus,LockKeyhole,Plus,Receipt,X,Save,Info} from 'lucide-react';
import {newId,type Accommodation,type Expense,type Plan,type TransportSegment} from '../../lib/travel';
import {logisticsOf} from '../../lib/trip-logistics';
import {createAccommodationEvents,createTransportEvent,downloadCalendarFile} from '../../lib/calendar-export';
import {AccommodationForm} from './accommodation-form';
import {AccommodationList} from './accommodation-list';
import {TransportForm} from './transport-form';
import {TransportList} from './transport-list';
import {ConfirmDialog} from '../confirm-dialog';
import {DocumentList} from './document-list';
import {listReservations} from '../../lib/reservation-library';

type ReservationTarget={kind:'accommodation'|'transport';id:string};
type PendingAction=ReservationTarget&{action:'cancel'|'delete'};
export function TripLogisticsPanel({plan,onChange,onError,authenticated,onOpenReservations}:{plan:Plan;onChange:(plan:Plan)=>boolean;onError:(message:string)=>void;authenticated:boolean;onOpenReservations:()=>void}){
 const logistics=logisticsOf(plan),readOnly=plan.collaboration?.role==='viewer';
 const [form,setForm]=useState<ReservationTarget|null>(null);
 const [documentCount,setDocumentCount]=useState(0);
 const [linkedPdfCount,setLinkedPdfCount]=useState<number|null>(null);
 useEffect(()=>{
  if(!authenticated||!plan.collaboration?.version){setLinkedPdfCount(null);return}
  let active=true;
  listReservations().then(rows=>{if(active)setLinkedPdfCount(rows.filter(r=>r.linked_trip_id===plan.id).length)})
   .catch(()=>{if(active)setLinkedPdfCount(null)});
  return()=>{active=false};
 },[authenticated,plan.id,plan.collaboration?.version]);
 const [pending,setPending]=useState<PendingAction|null>(null);
 const [link,setLink]=useState<ReservationTarget|null>(null);
 const [expenseId,setExpenseId]=useState(''),[amount,setAmount]=useState(''),[expenseLabel,setExpenseLabel]=useState(''),[expenseDate,setExpenseDate]=useState(plan.trip.start||new Date().toLocaleDateString('sv-SE'));
 const expenses=plan.expenses||[];
 const existing=(target:ReservationTarget)=>target.kind==='accommodation'?
 logistics.accommodations.find(a=>a.id===target.id):logistics.transports.find(t=>t.id===target.id);
 const saveAccommodation=(a:Accommodation)=>{
  if(readOnly)return;
  const next={...logistics,accommodations:[...logistics.accommodations.filter(x=>x.id!==a.id),a]};
  if(onChange({...plan,logistics:next}))setForm(null);
 };
 const saveTransport=(t:TransportSegment)=>{
  if(readOnly)return;
  const next={...logistics,transports:[...logistics.transports.filter(x=>x.id!==t.id),t]};
  if(onChange({...plan,logistics:next}))setForm(null);
 };
 const confirmAction=()=>{
  if(readOnly||!pending)return;
  const {kind,id,action}=pending;
  const next={
   accommodations:kind==='accommodation'?(action==='delete'?logistics.accommodations.filter(a=>a.id!==id):logistics.accommodations.map(a=>a.id===id?{...a,status:'cancelled' as const,updatedAt:new Date().toISOString()}:a)):logistics.accommodations,
   transports:kind==='transport'?(action==='delete'?logistics.transports.filter(t=>t.id!==id):logistics.transports.map(t=>t.id===id?{...t,status:'cancelled' as const,updatedAt:new Date().toISOString()}:t)):logistics.transports
  };
  // A deleted reservation must never delete its financial record.
  const cleaned=action==='delete'?expenses.map(e=>kind==='accommodation'&&e.linkedAccommodationId===id?{...e,linkedAccommodationId:undefined}:kind==='transport'&&e.linkedTransportId===id?{...e,linkedTransportId:undefined}:e):expenses;
  if(onChange({...plan,logistics:next,expenses:cleaned})){setPending(null);if(form?.id===id)setForm(null);}
 };
 const expenseName=(kind:ReservationTarget['kind'],id:string)=>expenses.find(e=>kind==='accommodation'?e.linkedAccommodationId===id:e.linkedTransportId===id)?.label;
 const openLink=(target:ReservationTarget)=>{
  if(readOnly)return;
  setLink(target);setExpenseId('');setExpenseDate(plan.trip.start||new Date().toLocaleDateString('sv-SE'));
  const selected=existing(target);
  const title=target.kind==='accommodation'?(selected as Accommodation|undefined)?.name:(selected as TransportSegment|undefined)?.origin+' → '+(selected as TransportSegment|undefined)?.destination;
  setExpenseLabel(title||'Reserva');setAmount(target.kind==='accommodation'&&selected&&'amount' in selected&&selected.currency==='EUR'?String(selected.amount||''):'');
 };
 const applyLink=(expense:Expense,target:ReservationTarget):Expense=>({
  ...expense,linkedAccommodationId:target.kind==='accommodation'?target.id:undefined,
  linkedTransportId:target.kind==='transport'?target.id:undefined
 });
 const linkExisting=()=>{
  if(readOnly||!link)return;
  if(!expenseId){onError('Elegí un gasto antes de vincularlo.');return}
  const selected=expenses.find(e=>e.id===expenseId);
  if(!selected){onError('El gasto seleccionado ya no existe.');return}
  if(onChange({...plan,expenses:expenses.map(e=>e.id===expenseId?applyLink(e,link):e)}))setLink(null);
 };
 const createExpense=()=>{
  if(readOnly||!link)return;
  const euros=Number(amount);
  if(!expenseLabel.trim()||!expenseDate||!Number.isFinite(euros)||euros<=0){onError('Completá el concepto, fecha y un importe en euros mayor a cero.');return}
  const isLodging=link.kind==='accommodation',t=isLodging?undefined:logistics.transports.find(t=>t.id===link.id);
  const category=isLodging?'Alojamiento':t?.kind==='flight'?'Vuelos':'Transporte';
  const expense=applyLink({id:newId(),date:expenseDate,label:expenseLabel.trim(),amount:Math.round(euros*100)/100,category,currency:'EUR',originalAmount:euros,rate:1},link);
  if(onChange({...plan,expenses:[...expenses,expense]})){setLink(null);setAmount('')}
 };
 const allEvents=()=>{
  try{
   const events=[...logistics.accommodations.flatMap(createAccommodationEvents),...logistics.transports.filter(t=>t.status!=='cancelled').map(createTransportEvent)];
   downloadCalendarFile(events,'viaja-'+plan.trip.destination+'-reservas');
  }catch(e){onError((e as Error).message)}
 };
 const isForm=(kind:ReservationTarget['kind'])=>form?.kind===kind;
 const editingAccom=isForm('accommodation')?logistics.accommodations.find(a=>a.id===form?.id):undefined;
 const editingTransport=isForm('transport')?logistics.transports.find(t=>t.id===form?.id):undefined;
 return <section className="trip-logistics" aria-labelledby="logistics-title">
  <div className="section-heading compact"><div><span className="eyebrow">TODO LISTO PARA SALIR</span><h2 id="logistics-title">La logística de tu viaje</h2><p>Direcciones, conexiones, horarios y comprobantes en un mismo lugar.</p></div><button type="button" className="secondary" onClick={allEvents} disabled={!logistics.accommodations.some(a=>a.status!=='cancelled')&&!logistics.transports.some(t=>t.status!=='cancelled')}><CalendarPlus size={17}/>Exportar reservas</button></div>
  <div className="logistics-summary" aria-label="Resumen de logística"><div><Plane size={21}/><strong>{logistics.transports.length}</strong><span>transportes</span></div><div><BedDouble size={21}/><strong>{logistics.accommodations.length}</strong><span>alojamientos</span></div><div><Files size={21}/><strong>{documentCount}</strong><span>documentos</span></div></div>
  <p className="logistics-privacy"><LockKeyhole size={16}/>Esta información es privada: nunca se incluye en los viajes publicados. {readOnly?'Tenés permiso de lectura.':'Se guarda junto a tu viaje y se comparte solo con colaboradores autorizados.'}</p>
  {isForm('accommodation')&&<AccommodationForm key={'accommodation-'+form?.id} value={editingAccom} tripStart={plan.trip.start} tripEnd={plan.trip.end} onSave={saveAccommodation} onCancel={()=>setForm(null)}/>}
  <AccommodationList items={logistics.accommodations} readOnly={readOnly} onAdd={()=>setForm({kind:'accommodation',id:'new'})} onEdit={id=>setForm({kind:'accommodation',id})} onDelete={id=>setPending({kind:'accommodation',id,action:'delete'})} onCancel={id=>setPending({kind:'accommodation',id,action:'cancel'})} onLinkExpense={id=>openLink({kind:'accommodation',id})} expenseName={id=>expenseName('accommodation',id)} onError={onError}/>
  {isForm('transport')&&<TransportForm key={'transport-'+form?.id} value={editingTransport} tripStart={plan.trip.start} tripEnd={plan.trip.end} onSave={saveTransport} onCancel={()=>setForm(null)}/>}
  <TransportList items={logistics.transports} readOnly={readOnly} onAdd={()=>setForm({kind:'transport',id:'new'})} onEdit={id=>setForm({kind:'transport',id})} onDelete={id=>setPending({kind:'transport',id,action:'delete'})} onCancel={id=>setPending({kind:'transport',id,action:'cancel'})} onLinkExpense={id=>openLink({kind:'transport',id})} expenseName={id=>expenseName('transport',id)} onError={onError}/>
  {link&&!readOnly&&<div className="logistics-form" role="region" aria-label="Vincular gasto"><div className="section-heading compact"><h3>Vincular un gasto a la reserva</h3><button type="button" className="iconbtn" aria-label="Cerrar vinculación" onClick={()=>setLink(null)}><X size={18}/></button></div><p className="subtle">El presupuesto solo cambia cuando agregás un gasto explícitamente. No duplicamos importes de reservas.</p>
   <div className="logistics-form-grid"><label className="full">Gasto registrado<select value={expenseId} onChange={e=>setExpenseId(e.target.value)}><option value="">Elegí un gasto existente</option>{expenses.map(e=><option value={e.id} key={e.id}>{e.label} · {e.amount.toFixed(2)} €</option>)}</select></label></div>
   <button className="secondary" type="button" onClick={linkExisting} disabled={!expenseId}><Receipt size={16}/>Vincular gasto existente</button>
   <div className="logistics-form-divider"><Info size={16}/>O registrá uno nuevo en euros</div>
   <div className="logistics-form-grid"><label>Concepto<input value={expenseLabel} maxLength={120} onChange={e=>setExpenseLabel(e.target.value)}/></label><label>Fecha<input type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)}/></label><label>Importe en EUR<input type="number" min=".01" step=".01" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)}/></label></div>
   <button className="primary" type="button" onClick={createExpense}><Plus size={16}/>Crear gasto y vincular</button>
  </div>}
  {authenticated&&<section className="logistics-block logistics-linked-reservations">
   <div className="section-heading compact"><div><h3>Mis PDFs vinculados a este viaje</h3><p className="subtle">Billetes y comprobantes de tu biblioteca personal. Se mantienen privados, incluso si compartís el itinerario.</p></div>
    <button type="button" className="secondary" onClick={onOpenReservations}>Abrir Reservas →</button></div>
   <p className="subtle">{linkedPdfCount===null?'Consultá tu biblioteca de reservas para ver tus archivos.':linkedPdfCount===0?'Todavía no vinculaste ningún PDF a este viaje.':linkedPdfCount+' PDF '+(linkedPdfCount===1?'vinculado':'vinculados')+' a este viaje.'}</p>
  </section>}
  <DocumentList tripId={plan.id} accommodations={logistics.accommodations} transports={logistics.transports}
   authenticated={authenticated} readOnly={readOnly} cloudSaved={Boolean(plan.collaboration?.version)}
   onCountChange={setDocumentCount} onError={onError}/>
  <ConfirmDialog open={!!pending} title={pending?.action==='cancel'?'¿Marcar reserva como cancelada?':'¿Eliminar esta reserva?'} description={pending?.action==='cancel'?'Quedará visible como cancelada y no se incluirá en los calendarios.':'Se eliminará la reserva, pero los gastos vinculados se conservarán sin esa referencia.'} confirmLabel={pending?.action==='cancel'?'Marcar cancelada':'Eliminar reserva'} danger={pending?.action==='delete'} onCancel={()=>setPending(null)} onConfirm={confirmAction}/>
 </section>;
}
