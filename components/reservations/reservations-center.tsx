'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CalendarCheck,CheckCircle2,CloudUpload,FileText,Filter,FolderLock,Hotel,Info,Link2,LockKeyhole,Plane,Plus,Search,ShieldCheck,Sparkles,Trash2,Eye,Pencil,UploadCloud,X} from 'lucide-react';
import type {Plan} from '../../lib/travel';
import type {ViajaSession} from '../../lib/supabase-client';
import {
 deleteReservationPdf,extractReservationPdf,listReservations,uploadReservationPdf,
 validateReservationPdf,type ReservationFile,type ReservationDetails,type ReservationKind,type ReservationChanges
} from '../../lib/reservation-library';
import {ReservationEditor} from './reservation-editor';
import {getPrivateDocumentUsage,type ViajaDocumentUsage} from '../../lib/private-upload-client.ts';
import {ReservationPdfViewer} from './reservation-pdf-viewer';
import {ConfirmDialog} from '../confirm-dialog';

const labelKind:Record<ReservationKind,string>={
 unclassified:'Sin clasificar',flight:'Vuelo',accommodation:'Alojamiento',mixed:'Varias reservas',other:'Otro comprobante'
};
type Proposal={kind:ReservationKind;title:string;details:ReservationDetails};
type EditorState={record:ReservationFile;proposal?:Proposal};
export function ReservationsCenter({
 session,plans,onOpenTrip,onError,focusTripId
}:{
 session:ViajaSession|null;plans:Plan[];onOpenTrip:(plan:Plan)=>void;onError:(error:string)=>void;focusTripId?:string|null;
}){
 const [items,setItems]=useState<ReservationFile[]>([]),[loading,setLoading]=useState(false);
 const [usage,setUsage]=useState<ViajaDocumentUsage|null>(null);
 const [revision,setRevision]=useState(0),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const [files,setFiles]=useState<File[]>([]),[uploading,setUploading]=useState(false);
 const [search,setSearch]=useState(''),[kindFilter,setKindFilter]=useState('all'),[onlyTrip,setOnlyTrip]=useState(focusTripId||'');
 const [editing,setEditing]=useState<EditorState|null>(null),[saving,setSaving]=useState(false);
 const [viewing,setViewing]=useState<ReservationFile|null>(null);
 const [deleting,setDeleting]=useState<ReservationFile|null>(null),[deletingBusy,setDeletingBusy]=useState(false);
 const [extracting,setExtracting]=useState<ReservationFile|null>(null),[extractBusy,setExtractBusy]=useState(false);
 const selectRef=useRef<HTMLInputElement>(null),addRef=useRef<HTMLDivElement>(null);
 const owner=session?.user.id||'';
 const reload=useCallback(()=>setRevision(x=>x+1),[]);
 useEffect(()=>{
  if(!owner){setItems([]);setError('');return}
  let live=true;setLoading(true);setError('');
  listReservations().then(res=>{if(live)setItems(res)}).catch(e=>{if(live)setError((e as Error).message)})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[owner,revision]);
 useEffect(()=>{
  if(!owner){setUsage(null);return}
  let active=true;
  getPrivateDocumentUsage().then(stats=>{if(active)setUsage(stats)})
   .catch(()=>{if(active)setUsage(null)});
  return()=>{active=false};
 },[owner,revision]);
 useEffect(()=>{if(focusTripId)setOnlyTrip(focusTripId)},[focusTripId]);
 const filtered=useMemo(()=>{
  const query=search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return items.filter(item=>{
   if(onlyTrip&&item.linked_trip_id!==onlyTrip)return false;
   if(kindFilter==='pending'&&item.reviewed_at)return false;
   if(kindFilter!=='all'&&kindFilter!=='pending'&&item.kind!==kindFilter)return false;
   if(!query)return true;
   const fields=[item.title,item.filename,item.details.provider,item.details.bookingReference,
    item.details.lodging?.name,item.details.lodging?.city,...item.details.flights.flatMap(f=>[f.origin,f.destination,f.company])];
   return fields.filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query);
  });
 },[items,search,kindFilter,onlyTrip]);
 const choose=async(candidates:File[])=>{
  const valid:File[]=[],issues:string[]=[];
  for(const file of candidates.slice(0,12)){
   try{await validateReservationPdf(file);valid.push(file)}
   catch(e){issues.push(file.name+': '+(e as Error).message)}
  }
  if(candidates.length>12)issues.push('Podés seleccionar hasta 12 PDFs por lote.');
  setFiles(valid);setError(issues.join(' '));setSuccess('');
  if(selectRef.current)selectRef.current.value='';
 };
 const upload=async()=>{
  if(!owner||uploading||!files.length)return;
  setUploading(true);setError('');setSuccess('');
  let count=0,failed:string[]=[];
  let first:ReservationFile|null=null;
  for(const file of files){
   try{const record=await uploadReservationPdf(file);if(!first)first=record;count++}
   catch(e){failed.push(file.name+': '+(e as Error).message)}
  }
  setUploading(false);
  setFiles([]);reload();
  if(failed.length)setError('No se pudieron guardar estos archivos: '+failed.join(' '));
  if(count)setSuccess(count+(count===1?' PDF guardado correctamente.':' PDFs guardados correctamente.')+' Son privados y no están vinculados a ningún viaje.');
  if(first&&count===1)setEditing({record:first});
 };
 const save=async(changes:ReservationChanges)=>{
  if(!editing||saving)return;
  setSaving(true);
  try{
   const {updateReservation}=await import('../../lib/reservation-library');
   await updateReservation(editing.record.id,changes);
   setEditing(null);setSuccess('Reserva revisada y guardada correctamente.');reload();
  }catch(e){throw e}
  finally{setSaving(false)}
 };
 const runExtraction=async()=>{
  if(!extracting||extractBusy)return;
  setExtractBusy(true);setError('');setSuccess('');
  const target=extracting;
  try{
   const suggestion=await extractReservationPdf(target);
   setExtracting(null);setEditing({record:target,proposal:suggestion});
   setSuccess('La IA propuso datos para revisar. Nada se guardará hasta que confirmes.');
  }catch(e){
   setExtracting(null);setError((e as Error).message);
  }finally{setExtractBusy(false)}
 };
 const erase=async()=>{
  if(!deleting||deletingBusy)return;
  setDeletingBusy(true);setError('');
  try{
   await deleteReservationPdf(deleting);setDeleting(null);
   setSuccess('El PDF privado fue eliminado. No se modificó ningún viaje.');
   reload();
  }catch(e){setError((e as Error).message)}
  finally{setDeletingBusy(false)}
 };
 const closeEditor=()=>{setEditing(null);setSuccess('')};
 const filterOptions=[['all','Todas'],['flight','Vuelos'],['accommodation','Alojamientos'],['pending','Por revisar'],['other','Otros']] as const;
 const tripName=(id:string|null)=>id?plans.find(p=>p.id===id)?.trip.destination||'Viaje no disponible':'Sin viaje';
 const scrollAdd=()=>addRef.current?.scrollIntoView({behavior:'smooth',block:'center'});
 return <section className="reservation-center" aria-labelledby="reservations-main-heading">
  <header className="reservation-page-header"><div><span className="eyebrow">DOCUMENTOS EN UN SOLO LUGAR</span>
   <h1 id="reservations-main-heading">Tus reservas, siempre a mano.</h1>
   <p>Guardá vuelos, alojamientos y billetes en PDF. No necesitás crear un viaje ni usar IA para organizarte.</p>
  </div><button className="primary" type="button" onClick={scrollAdd}><Plus size={18}/>Importar PDF</button></header>
  <div className="reservation-overview" aria-label="Resumen de reservas">
   <div><FileText size={23}/><strong>{items.length}</strong><span>PDF privados</span></div>
   <div><CalendarCheck size={23}/><strong>{items.filter(x=>x.linked_trip_id).length}</strong><span>Con viaje</span></div>
   <div><ShieldCheck size={23}/><strong>{items.filter(x=>!x.reviewed_at).length}</strong><span>Por revisar</span></div>
  </div>
  {owner&&usage&&<p className="reservation-quota-status" role="status">
   <LockKeyhole size={16}/>Almacenamiento privado: <strong>{usage.files} de {usage.maxFiles} documentos</strong>
   · <strong>{(usage.bytes/1048576).toFixed(1)} de {(usage.maxBytes/1048576).toFixed(0)} MB</strong>
   · {usage.uploadsLast24h} de {usage.maxUploadsLast24h} cargas en las últimas 24 horas.
  </p>}
  <section ref={addRef} className="reservation-import" aria-labelledby="reservation-import-heading">
   <div className="reservation-section-heading"><div><h2 id="reservation-import-heading">Importá tus comprobantes</h2>
    <p>Solo PDF. Máximo 10 MB por archivo. También podés guardar billetes con códigos QR dentro del PDF.</p></div>
    <span className="reservation-secure-label"><LockKeyhole size={15}/>Privado</span>
   </div>
   {owner?<div className="reservation-dropzone" onDragOver={e=>e.preventDefault()}
    onDrop={e=>{e.preventDefault();void choose(Array.from(e.dataTransfer.files))}}>
    <CloudUpload size={31}/><strong>Arrastrá acá tus PDFs</strong>
    <p>O seleccioná uno o varios archivos desde tu dispositivo.</p>
    <input ref={selectRef} type="file" accept=".pdf,application/pdf" multiple
     className="reservation-file-input" aria-label="Seleccionar PDFs" onChange={e=>void choose(Array.from(e.target.files||[]))}/>
    <button className="secondary" type="button" onClick={()=>selectRef.current?.click()} disabled={uploading}><FileText size={17}/>Elegir archivos PDF</button>
   </div>:
   <div className="reservation-guest-warning"><LockKeyhole size={25}/><div><strong>Iniciá sesión para guardar reservas privadas.</strong>
    <p>Podés planificar viajes sin una cuenta, pero los PDF y billetes requieren una sesión para protegerlos y acceder desde otros dispositivos.</p></div></div>}
   {files.length>0&&<div className="reservation-file-queue">
    <p><CheckCircle2 size={17}/>{files.length} PDF {files.length===1?'seleccionado':'seleccionados'} para importar</p>
    {files.map((f,i)=><div key={i}><span>{f.name} · {(f.size/1048576).toFixed(2)} MB</span>
     <button type="button" className="iconbtn" aria-label={'Quitar '+f.name} disabled={uploading} onClick={()=>setFiles(x=>x.filter((_,j)=>j!==i))}><X size={17}/></button></div>)}
    <button className="primary" type="button" disabled={uploading} onClick={()=>void upload()}><UploadCloud size={17}/>{uploading?'Guardando PDFs…':'Guardar PDFs privados'}</button>
    <p className="subtle">Los archivos se guardarán sin viaje asociado. Podés vincularlos después.</p>
   </div>}
  </section>
  {error&&<p role="alert" className="reservation-message reservation-message-error">{error}</p>}
  {success&&<p role="status" className="reservation-message"><CheckCircle2 size={17}/>{success}</p>}
  {editing&&<ReservationEditor key={editing.record.id+(editing.proposal?'-suggested':'-manual')}
   record={editing.record} proposal={editing.proposal} plans={plans}
   onSave={save} onCancel={closeEditor} busy={saving}/>}
  <section className="reservation-library" aria-label="Biblioteca de reservas">
   <div className="reservation-section-heading"><div><h2>Mi biblioteca</h2><p>Accedé a los originales, completá la información y vinculá tus viajes cuando quieras.</p></div>
    {owner&&<button type="button" className="secondary" onClick={reload} disabled={loading}>Actualizar</button>}
   </div>
   <div className="reservation-search-toolbar"><label className="reservation-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)}
    placeholder="Buscar compañía, destino, hotel..." aria-label="Buscar reservas"/></label>
    <label className="reservation-trip-filter"><Filter size={17}/><select value={onlyTrip} onChange={e=>setOnlyTrip(e.target.value)} aria-label="Filtrar por viaje">
     <option value="">Todos los viajes</option>{plans.filter(p=>p.collaboration?.version).map(p=><option key={p.id} value={p.id}>{p.trip.destination}</option>)}
    </select></label>
   </div>
   <div className="reservation-filters" role="group" aria-label="Filtrar tipo de reserva">
    {filterOptions.map(([value,label])=><button type="button" key={value} aria-pressed={kindFilter===value} onClick={()=>setKindFilter(value)}>{label}</button>)}
   </div>
   {!owner?<div className="reservation-empty"><FolderLock size={34}/><h3>Tu biblioteca personal está protegida.</h3><p>Iniciá sesión desde el menú superior para acceder a tus PDF privados.</p></div>:
    loading?<div className="reservation-empty" role="status">Cargando tus reservas privadas…</div>:
    !filtered.length?<div className="reservation-empty"><FileText size={33}/><h3>{items.length?'No hay coincidencias':'Todavía no guardaste reservas.'}</h3>
      <p>{items.length?'Probá otro filtro o buscá por un nombre diferente.':'Podés empezar por un billete de avión o una confirmación de alojamiento en PDF.'}</p>
      {!items.length&&<button className="secondary" type="button" onClick={scrollAdd}>Importar mi primer PDF</button>}
     </div>:
    <div className="reservation-card-grid">{filtered.map(record=>{
     const associated=plans.find(p=>p.id===record.linked_trip_id);
     const Icon=record.kind==='flight'?Plane:record.kind==='accommodation'?Hotel:FileText;
     const label=[record.details.flights[0]?.origin,record.details.flights[0]?.destination].filter(Boolean).join(' → ')||
      [record.details.lodging?.name,record.details.lodging?.city].filter(Boolean).join(' · ')||record.details.provider||'';
     return <article key={record.id} className="reservation-card">
      <div className="reservation-card-header"><span className="reservation-kind-icon"><Icon size={21}/></span>
       <div><span className="reservation-kind">{labelKind[record.kind]}</span><h3>{record.title||record.filename}</h3></div>
       <span className={'reservation-review-state '+(record.reviewed_at?'is-reviewed':'is-pending')}>{record.reviewed_at?'Revisada':'Por revisar'}</span>
      </div>
      {label&&<p className="reservation-card-description">{label}</p>}
      <p className="reservation-file-meta"><FileText size={15}/>{record.filename} · {(record.size_bytes/1048576).toFixed(1)} MB</p>
      <div className="reservation-trip-status"><Link2 size={15}/>
       {record.linked_trip_id?<span>Vinculada a <strong>{tripName(record.linked_trip_id)}</strong></span>:<span>Sin viaje vinculado</span>}
       {associated&&<button type="button" className="reservation-inline-link" onClick={()=>onOpenTrip(associated)}>Abrir viaje</button>}
      </div>
      <div className="reservation-card-actions">
       <button className="secondary" type="button" onClick={()=>setViewing(record)}><Eye size={17}/>Ver PDF / QR</button>
       <button className="secondary" type="button" onClick={()=>{setEditing({record});setSuccess('')}}><Pencil size={17}/>Editar / vincular</button>
       <button className="secondary" type="button" onClick={()=>setExtracting(record)}><Sparkles size={17}/>Extraer con IA</button>
       <button className="iconbtn" type="button" onClick={()=>setDeleting(record)} aria-label={'Eliminar reserva '+record.filename}><Trash2 size={18}/></button>
      </div>
     </article>;
    })}</div>}
   <p className="reservation-private-note"><LockKeyhole size={16}/>Tus PDFs no se publican en Explorar destinos. Vincularlos a un viaje no comparte los archivos automáticamente.</p>
  </section>
  {viewing&&<ReservationPdfViewer reservation={viewing} onClose={()=>setViewing(null)}/>}
  <ConfirmDialog open={!!deleting} title="¿Eliminar esta reserva PDF?"
   description={deleting?'Se eliminará definitivamente el documento “'+deleting.filename+'”. No se borrará ningún viaje ni gasto.':''}
   confirmLabel="Eliminar PDF" danger busy={deletingBusy} onCancel={()=>setDeleting(null)} onConfirm={()=>void erase()}/>
  <ConfirmDialog open={!!extracting} title="¿Analizar este PDF con Gemini?"
   description={extracting?'Se enviará únicamente el archivo “'+extracting.filename+'” a Gemini para leer vuelos o alojamientos. Se permite un máximo de 3 análisis por usuario cada 24 horas. Los datos se mostrarán para revisión y NO se guardarán sin tu confirmación. Podés cancelar y editar manualmente.':''}
   confirmLabel="Acepto, analizar PDF" danger={false} busy={extractBusy} onCancel={()=>setExtracting(null)} onConfirm={()=>void runExtraction()}/>
 </section>;
}
