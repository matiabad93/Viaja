'use client';
import {Plane,Plus} from 'lucide-react';
import type {TransportSegment} from '../../lib/travel';
import {chronological} from '../../lib/trip-logistics';
import {TransportCard} from './transport-card';
type Props={items:TransportSegment[];readOnly:boolean;onAdd:()=>void;onEdit:(id:string)=>void;onDelete:(id:string)=>void;onCancel:(id:string)=>void;onLinkExpense:(id:string)=>void;expenseName:(id:string)=>string|undefined;onError:(s:string)=>void};
export function TransportList({items,readOnly,onAdd,onEdit,onDelete,onCancel,onLinkExpense,expenseName,onError}:Props){
 return <section className="logistics-block"><div className="section-heading compact"><div><h3>Transportes</h3><p className="subtle">Vuelos, trenes, colectivos y traslados en orden cronológico.</p></div>{!readOnly&&<button className="secondary" type="button" onClick={onAdd}><Plus size={16}/>Agregar</button>}</div>
 {items.length?<ol className="logistics-timeline">{[...items].sort(chronological).map(t=><li key={t.id}><TransportCard value={t} readOnly={readOnly} onEdit={()=>onEdit(t.id)} onDelete={()=>onDelete(t.id)} onCancel={()=>onCancel(t.id)} onLinkExpense={()=>onLinkExpense(t.id)} linkedExpense={expenseName(t.id)} onError={onError}/></li>)}</ol>:
 <div className="logistics-empty"><Plane size={30}/><strong>Tené todos los traslados bajo control.</strong><p>Agregá vuelos, trenes y conexiones con sus horarios reales.</p>{!readOnly&&<button className="secondary" type="button" onClick={onAdd}><Plus size={16}/>Agregar transporte</button>}</div>}
 </section>;
}
