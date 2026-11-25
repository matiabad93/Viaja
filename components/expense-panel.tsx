'use client';
import {useState} from 'react';
import {Plus,Wallet,Trash2,Pencil,Check,Plane,Hotel,Utensils,Bus,Ticket,ShoppingBag,MoreHorizontal} from 'lucide-react';
import {newId,money,spent,budgetSpent,extraSpent,dateLabel} from '../lib/travel';
import type {Plan,Expense} from '../lib/travel';
import {projectedCosts} from '../lib/trip-feasibility';
import type {ProjectedCost} from '../lib/trip-feasibility';
import {editProjectedCost} from '../lib/expense-estimates';
import {ConfirmDialog} from './confirm-dialog';
import styles from './expense-estimate-actions.module.css';

const categories=['Transporte','Vuelos','Alojamiento','Comida','Actividades','Compras','Otros'];
const pendingCategories=['Transporte','Comida','Actividades'] as const;
const icons:Record<string,typeof Wallet>={Transporte:Bus,Vuelos:Plane,Alojamiento:Hotel,Comida:Utensils,Actividades:Ticket,Compras:ShoppingBag,Otros:MoreHorizontal};
const today=()=>new Date().toLocaleDateString('sv-SE');
const blank=():Expense=>({id:'',date:today(),label:'',category:'Comida',amount:0,currency:'EUR',originalAmount:0,rate:1});
type Editor={mode:'pending'|'register'|'new'|'edit';value:Expense;amount:string};
type Removal={kind:'pending'|'recorded';id:string;label:string};

export function ExpensePanel({plan,onChange,readOnly=false}:{plan:Plan;onChange:(p:Plan)=>boolean;readOnly?:boolean}){
 const [tab,setTab]=useState<'pending'|'recorded'>('pending');
 const [editor,setEditor]=useState<Editor|null>(null);
 const [removal,setRemoval]=useState<Removal|null>(null);
 const [error,setError]=useState('');
 const [category,setCategory]=useState('Todas');
 const [date,setDate]=useState('');
 const expenses=plan.expenses||[];
 const paidIds=new Set(expenses.map(e=>e.linkedActivityId).filter(Boolean));
 const pending=projectedCosts(plan).filter(item=>!paidIds.has(item.activityId));
 const pendingTotal=pending.reduce((sum,item)=>sum+Math.round(item.amount*100),0)/100;
 const total=spent(plan),daily=budgetSpent(plan),extra=extraSpent(plan),hasBudget=plan.trip.budget>0,remaining=plan.trip.budget-daily;
 const active=tab;
 const filteredPending=pending.filter(e=>(category==='Todas'||e.category===category)&&(!date||e.date===date));
 const filteredRecorded=expenses.filter(e=>(category==='Todas'||e.category===category)&&(!date||e.date===date)).slice().sort((a,b)=>b.date.localeCompare(a.date));
 const open=(mode:Editor['mode'],value:Expense)=>{setError('');setEditor({mode,value,amount:mode==='new'?'':String(value.originalAmount??value.amount)})};
 const close=()=>{setEditor(null);setError('')};
 const openPending=(item:ProjectedCost,mode:'pending'|'register')=>open(mode,{id:'',label:item.label,category:item.category,date:mode==='register'?today():item.date,amount:item.amount,originalAmount:item.amount,currency:'EUR',rate:1,linkedActivityId:item.activityId});
 const changeTab=(next:'pending'|'recorded')=>{setTab(next);setCategory('Todas');setDate('');close()};
 const patch=(value:Partial<Expense>)=>setEditor(current=>current?{...current,value:{...current.value,...value}}:current);
 const submit=(event:React.FormEvent)=>{
  event.preventDefault();if(!editor||readOnly)return;
  const {mode,value}=editor,label=value.label.trim(),original=Number(editor.amount.replace(',','.')),rate=value.currency==='EUR'?1:Number(value.rate);
  if(!label||label.length>120||!editor.amount.trim()||!Number.isFinite(original)||original<0||original>1000000||!Number.isFinite(rate)||rate<=0){setError('Revisá el concepto, el importe y la moneda.');return}
  if(mode==='pending'){
   const next=editProjectedCost(plan,value.linkedActivityId||'',original,label,value.category as typeof pendingCategories[number]);
   if(!next||!onChange(next)){setError('No se pudo guardar el gasto pendiente.');return}
  }else{
   if(original<=0||!value.date){setError('Ingresá un importe mayor a cero y una fecha válida.');return}
   if(mode==='register'&&(!pending.some(p=>p.activityId===value.linkedActivityId)||paidIds.has(value.linkedActivityId))){setError('Este gasto ya no está pendiente. Cerrá el formulario y revisá el registro.');return}
   const next:Expense={...value,label,id:value.id||newId(),originalAmount:original,rate,amount:Math.round(original*rate*100)/100};
   if(!Number.isFinite(next.amount)||next.amount<=0||next.amount>1000000){setError('Revisá el importe convertido a euros.');return}
   if(!onChange({...plan,expenses:[...expenses.filter(x=>x.id!==next.id),next]})){setError('No se pudo guardar el gasto.');return}
   setTab('recorded');setCategory('Todas');setDate('');
  }
  close();
 };
 const remove=()=>{
  if(!removal||readOnly)return;
  const next=removal.kind==='pending'?editProjectedCost(plan,removal.id,null):{...plan,expenses:expenses.filter(e=>e.id!==removal.id)};
  if(next&&onChange(next)){setRemoval(null);close()}else setError('No se pudo eliminar el gasto.');
 };
 const showEditor=(editor:Editor)=>{
  const isPending=editor.mode==='pending',isRegister=editor.mode==='register',isNew=editor.mode==='new';
  const editorCategories=isPending?pendingCategories:Array.from(new Set([...categories,editor.value.category]));
  return <form className={styles.editor} onSubmit={submit}>
   <div className={styles.editorHeader}><div><h3>{isPending?'Editar pendiente':isRegister?'Registrar gasto':isNew?'Nuevo gasto':'Editar gasto'}</h3><small>{isRegister?'Revisá los datos antes de confirmar el pago.':isPending?'Los cambios no modifican tu itinerario.':'Completá los datos del gasto.'}</small></div><button type="button" className="secondary" onClick={close}>Cancelar</button></div>
   <div className="input-grid">
    <label className="full">Concepto<input autoFocus required maxLength={120} value={editor.value.label} onChange={e=>patch({label:e.target.value})} placeholder="Tren, cena, entrada…"/></label>
    <label>Importe{isPending?' (€)':''}<input required inputMode="decimal" value={editor.amount} onChange={e=>setEditor({...editor,amount:e.target.value})} placeholder="0,00"/></label>
    {!isPending&&<label>Moneda<select value={editor.value.currency||'EUR'} onChange={e=>patch({currency:e.target.value,rate:e.target.value==='EUR'?1:undefined})}>{['EUR','USD','GBP','CHF','PLN','ARS','BRL'].map(c=><option key={c}>{c}</option>)}</select></label>}
    {!isPending&&editor.value.currency!=='EUR'&&<label className="full">Valor en euros de 1 {editor.value.currency}<input required type="number" min=".000001" step="any" inputMode="decimal" value={editor.value.rate||''} onChange={e=>patch({rate:Number(e.target.value)})}/><small>Ingresá la cotización utilizada en tu pago.</small></label>}
    <label>Categoría<select value={editor.value.category} onChange={e=>patch({category:e.target.value})}>{editorCategories.map(c=><option key={c}>{c}</option>)}</select></label>
    {!isPending&&<label>Fecha del gasto<input required type="date" value={editor.value.date} onChange={e=>patch({date:e.target.value})}/></label>}
   </div>
   {error&&<p role="alert" className="error">{error}</p>}
   <div className={styles.editorActions}>
    {(isPending||editor.mode==='edit')&&<button type="button" className={styles.iconAction} title="Eliminar gasto" aria-label={'Eliminar '+editor.value.label} onClick={()=>setRemoval({kind:isPending?'pending':'recorded',id:isPending?editor.value.linkedActivityId!:editor.value.id,label:editor.value.label})}><Trash2 size={19} aria-hidden="true"/></button>}
    <button className="primary" type="submit">{isRegister?<><Check size={18}/>Confirmar gasto</>:'Guardar cambios'}</button>
   </div>
  </form>
 };
 return <section className={styles.panel}>
  <div className={styles.heading}><h2>Gastos</h2>{!readOnly&&<button className="primary" onClick={()=>open('new',blank())}><Plus size={18}/>Agregar gasto</button>}</div>
  <div className={styles.summary}>
   <div className={styles.balance}><span>Disponible para gastos diarios</span><strong>{hasBudget?money(remaining):'Sin presupuesto'}</strong>{hasBudget&&<><progress max={plan.trip.budget} value={Math.min(plan.trip.budget,Math.max(0,daily))} aria-label="Presupuesto diario utilizado"/><small>{money(daily)} de {money(plan.trip.budget)} utilizados</small></>}</div>
   <div className={styles.stats}><div><span>Pendientes</span><b>{money(pendingTotal)}</b></div><div><span>Registrados</span><b>{money(total)}</b></div></div>
   {extra>0&&<small>Incluye {money(extra)} en vuelos y alojamiento fuera del presupuesto diario.</small>}
   {hasBudget&&remaining<0&&<small role="status">Superaste el presupuesto diario en {money(-remaining)}.</small>}
  </div>
  <div className={styles.tabs} role="group" aria-label="Estado de los gastos">
   <button type="button" aria-pressed={active==='pending'} className={active==='pending'?styles.active:''} onClick={()=>changeTab('pending')}>Pendientes <span>{pending.length}</span></button>
   <button type="button" aria-pressed={active==='recorded'} className={active==='recorded'?styles.active:''} onClick={()=>changeTab('recorded')}>Registrados <span>{expenses.length}</span></button>
  </div>
  {editor&&!readOnly&&showEditor(editor)}
  <div className={styles.listHeader}><small>{active==='pending'?'Revisá los importes sugeridos y confirmalos cuando pagues.':'Tus gastos confirmados, incluidos vuelos y alojamiento.'}</small></div>
  <details className={styles.filters}><summary>Filtrar gastos{category!=='Todas'||date?' · activos':''}</summary><div className="input-grid"><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button type="button" className="secondary" onClick={()=>{setCategory('Todas');setDate('')}}>Limpiar filtros</button></div></details>
  <div className={styles.list}>
   {active==='pending'&&filteredPending.map(item=>{const Icon=icons[item.category]||Wallet;return <div className={styles.line} key={item.activityId}>
    <span className={styles.categoryIcon}><Icon size={20} aria-hidden="true"/></span>
    <div className={styles.lineText}><strong>{item.label}</strong><small>{dateLabel(item.date)} · {item.category}</small></div>
    <b className={styles.amount}>{money(item.amount)}</b>
    {!readOnly&&<div className={styles.actions}><button type="button" className={styles.iconAction} title="Editar pendiente" aria-label={'Editar pendiente de '+item.label} onClick={()=>openPending(item,'pending')}><Pencil size={18} aria-hidden="true"/></button>{item.amount>0&&<button type="button" className={styles.confirmAction} title="Registrar gasto" aria-label={'Registrar gasto de '+item.label} onClick={()=>openPending(item,'register')}><Check size={20} aria-hidden="true"/></button>}</div>}
   </div>})}
   {active==='recorded'&&filteredRecorded.map(item=>{const Icon=icons[item.category]||Wallet;return <div className={styles.line} key={item.id}>
    <span className={styles.categoryIcon}><Icon size={20} aria-hidden="true"/></span>
    <div className={styles.lineText}><strong>{item.label}</strong><small>{dateLabel(item.date)} · {item.category}{item.currency&&item.currency!=='EUR'?' · '+item.originalAmount+' '+item.currency:''}</small></div>
    <b className={styles.amount}>{money(item.amount)}</b>
    {!readOnly&&<div className={styles.actions}><button type="button" className={styles.iconAction} title="Editar gasto" aria-label={'Editar gasto '+item.label} onClick={()=>open('edit',{...item,currency:item.currency||'EUR',originalAmount:item.originalAmount??item.amount,rate:item.rate??1})}><Pencil size={18} aria-hidden="true"/></button></div>}
   </div>})}
   {((active==='pending'&&!filteredPending.length)||(active==='recorded'&&!filteredRecorded.length))&&<div className={styles.empty}><Wallet size={28} aria-hidden="true"/><h3>{category!=='Todas'||date?'No hay gastos con estos filtros':active==='pending'?'Todo al día':'Todavía no hay gastos registrados'}</h3><p>{category!=='Todas'||date?'Probá con otros filtros.':active==='pending'?'Los gastos que todavía no confirmaste aparecen acá.':'Agregá un gasto o confirmá uno pendiente.'}</p></div>}
  </div>
  {active==='recorded'&&expenses.length>0&&<details className={styles.breakdown}><summary>Ver gastos por categoría</summary>{Array.from(new Set(expenses.map(e=>e.category))).map(c=>{const sum=expenses.filter(e=>e.category===c).reduce((n,e)=>n+Math.round(e.amount*100),0)/100;return <div className="category-row" key={c}><div><span>{c}</span><b>{money(sum)}</b></div><progress max={total||1} value={sum} aria-label={c}/></div>})}</details>}
  {!editor&&error&&<p role="alert" className="error">{error}</p>}
  <ConfirmDialog open={!!removal} title={removal?.kind==='pending'?'¿Quitar gasto pendiente?':'¿Eliminar gasto registrado?'} description={removal?.kind==='pending'?'Se quitará el gasto de la lista, sin modificar tu itinerario.':'Se eliminará el pago del total. Si está vinculado a una actividad, volverá a Pendientes.'} confirmLabel="Eliminar" onCancel={()=>setRemoval(null)} onConfirm={remove}/>
 </section>
}
