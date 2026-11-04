'use client';
import {BedDouble,Plus} from 'lucide-react';
import type {Accommodation} from '../../lib/travel';
import {AccommodationCard} from './accommodation-card';
type Props={items:Accommodation[];readOnly:boolean;onAdd:()=>void;onEdit:(id:string)=>void;onDelete:(id:string)=>void;onCancel:(id:string)=>void;onLinkExpense:(id:string)=>void;expenseName:(id:string)=>string|undefined;onError:(s:string)=>void};
export function AccommodationList({items,readOnly,onAdd,onEdit,onDelete,onCancel,onLinkExpense,expenseName,onError}:Props){
 return <section className="logistics-block"><div className="section-heading compact"><div><h3>Alojamientos</h3><p className="subtle">Hoteles, departamentos y estancias en distintas ciudades.</p></div>{!readOnly&&<button className="secondary" type="button" onClick={onAdd}><Plus size={16}/>Agregar</button>}</div>
 {items.length?<div className="logistics-card-list">{[...items].sort((a,b)=>a.checkIn.localeCompare(b.checkIn)).map(a=><AccommodationCard key={a.id} value={a} readOnly={readOnly} onEdit={()=>onEdit(a.id)} onDelete={()=>onDelete(a.id)} onCancel={()=>onCancel(a.id)} onLinkExpense={()=>onLinkExpense(a.id)} linkedExpense={expenseName(a.id)} onError={onError}/>)}</div>:
 <div className="logistics-empty"><BedDouble size={30}/><strong>Tu próximo alojamiento, todo en un lugar.</strong><p>Agregá la dirección y las fechas de una reserva, aunque todavía no esté confirmada.</p>{!readOnly&&<button className="secondary" type="button" onClick={onAdd}><Plus size={16}/>Agregar alojamiento</button>}</div>}
 </section>;
}
