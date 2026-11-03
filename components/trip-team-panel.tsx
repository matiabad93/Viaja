'use client';
import {useEffect,useState} from 'react';
import {Users,UserPlus,Link2,Copy,RefreshCw,ShieldCheck,Eye,Trash2,Check,Clock3,LockKeyhole} from 'lucide-react';
import type {Plan} from '../lib/travel';
import {getCurrentSession} from '../lib/supabase-client';
import {listTripMembers,listTripInvites,createTripInvite,revokeTripInvite,removeTripMember,fetchTripUpdate,type TripMember,type TripInvite} from '../lib/trip-collaboration';

export function TripTeamPanel({plan,onRefresh,onError}:{plan:Plan;onRefresh:()=>Promise<void>;onError:(message:string)=>void}){
 const role=plan.collaboration?.role||null;
 const [members,setMembers]=useState<TripMember[]>([]);
 const [invites,setInvites]=useState<TripInvite[]>([]);
 const [busy,setBusy]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [email,setEmail]=useState('');
 const [permission,setPermission]=useState<'editor'|'viewer'>('editor');
 const [link,setLink]=useState('');
 const [copied,setCopied]=useState(false);
 const [notice,setNotice]=useState('');
 const [remoteVersion,setRemoteVersion]=useState<number|null>(null);
 const [loadingRemote,setLoadingRemote]=useState(false);
 const me=getCurrentSession()?.user.id||'';
 const owner=role==='owner';
 const editable=owner||role==='editor';
 const load=async()=>{
   if(!plan.collaboration)return;
   try{
     const [people,pending]=await Promise.all([listTripMembers(plan.id),owner?listTripInvites(plan.id):Promise.resolve([])]);
     setMembers(people);setInvites(pending);setLoaded(true);
   }catch(e){onError(e instanceof Error?e.message:'No pudimos consultar el equipo.');}
 };
 useEffect(()=>{void load()},[plan.id,role]);
 useEffect(()=>{
   if(!plan.collaboration||!getCurrentSession())return;
   let active=true;
   const check=async()=>{
     try{
       const latest=await fetchTripUpdate(plan.id);
       if(active&&latest?.collaboration&&latest.collaboration.version>(plan.collaboration?.version||0))setRemoteVersion(latest.collaboration.version);
     }catch{/* Failed checks do not silently replace local changes. */}
   };
   const interval=setInterval(()=>void check(),20000);
   return()=>{active=false;clearInterval(interval)};
 },[plan.id,plan.collaboration?.version]);
 const refresh=async()=>{setLoadingRemote(true);try{await onRefresh();setRemoteVersion(null);setNotice('Viaje actualizado con los últimos cambios.')}catch(e){onError(e instanceof Error?e.message:'No se pudo actualizar.')}finally{setLoadingRemote(false)}};
 const invite=async(e:React.FormEvent)=>{e.preventDefault();if(!owner||busy)return;setBusy(true);setNotice('');setLink('');
  try{
    const token=await createTripInvite(plan.id,permission,email.trim()||null);
    setLink(window.location.origin+'/?invitacion='+token);
    setCopied(false);setNotice('Invitación válida durante 72 horas. Solo funciona al iniciar sesión.');
    await load();
  }catch(e){setNotice(e instanceof Error?e.message:'No se pudo crear la invitación.')}
  finally{setBusy(false)}
 };
 const copy=async()=>{
   try{await navigator.clipboard.writeText(link);setCopied(true)}
   catch{setNotice('Seleccioná y copiá el enlace desde el campo.')}
 };
 const revoke=async(id:string)=>{if(!owner||busy)return;setBusy(true);
  try{await revokeTripInvite(id);setLink('');await load();setNotice('Invitación cancelada.')}
  catch(e){onError(e instanceof Error?e.message:'No se pudo cancelar la invitación.')}
  finally{setBusy(false)}
 };
 const remove=async(id:string)=>{if(busy)return;setBusy(true);
  try{await removeTripMember(plan.id,id);await load();setNotice('Acceso retirado.')}
  catch(e){onError(e instanceof Error?e.message:'No se pudo retirar el acceso.')}
  finally{setBusy(false)}
 };
 return <section className="trip-team-panel" aria-label="Equipo del viaje">
  <div className="section-heading compact"><div><span className="eyebrow">ORGANIZALO JUNTOS</span><h2>Tu viaje, en equipo.</h2><p>Invitá a otras personas a colaborar sin publicar el viaje en Explorar.</p></div><Users size={26}/></div>
  {!plan.collaboration?<div className="surface"><LockKeyhole size={22}/><h3>Primero guardá el viaje en tu cuenta</h3><p>Para compartir la edición necesitás iniciar sesión y tener este viaje sincronizado.</p></div>:<>
   <div className="team-state-banner"><ShieldCheck size={18}/><span>{owner?'Sos el organizador. Solo vos podés invitar y administrar accesos.':editable?'Podés modificar el itinerario y los gastos.':'Tenés acceso de lectura a este viaje.'}</span></div>
   {remoteVersion!==null&&<div className="team-state-banner team-remote-change" role="status"><RefreshCw size={18}/><span>Otro integrante modificó el viaje. Guardá una copia de tus cambios pendientes antes de actualizar.</span><button className="secondary" type="button" disabled={loadingRemote} onClick={()=>void refresh()}>Cargar cambios nuevos</button></div>}
   <div className="surface">
     <div className="section-heading compact"><h3>Colaboradores ({members.length+1})</h3><button className="textbtn" type="button" onClick={()=>void load()}><RefreshCw size={15}/>Actualizar</button></div>
     <div className="team-member-row"><span className="team-avatar"><ShieldCheck size={18}/></span><span><strong>Organizador {owner?'(vos)':''}</strong><small>Control total del viaje</small></span><strong className="team-role">Propietario</strong></div>
     {members.map(member=><div className="team-member-row" key={member.user_id}>
       <span className="team-avatar"><Users size={17}/></span>
       <span><strong>{member.user_id===me?'Vos':'Integrante '+member.user_id.slice(0,6)}</strong><small>{member.role==='editor'?'Puede editar':'Solo lectura'}</small></span>
       {owner&&<button type="button" className="iconbtn" disabled={busy} title="Quitar colaborador" aria-label={'Quitar '+member.user_id.slice(0,6)} onClick={()=>void remove(member.user_id)}><Trash2 size={17}/></button>}
     </div>)}
     {loaded&&members.length===0&&<p className="subtle">Todavía no hay colaboradores. Sumá a alguien para empezar.</p>}
   </div>
   {owner&&<div className="surface">
     <h3><UserPlus size={19}/> Sumar colaborador</h3>
     <p className="subtle">Elegí si puede editar o solamente consultar. El enlace es privado, temporal y se utiliza una sola vez.</p>
     <form className="team-invite-form" onSubmit={e=>void invite(e)}>
       <label>Email (opcional; restringe quién puede aceptar)<input type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} placeholder="amigo@ejemplo.com"/></label>
       <label>Permisos<select value={permission} onChange={e=>setPermission(e.target.value as 'editor'|'viewer')}><option value="editor">Puede editar</option><option value="viewer">Solo puede ver</option></select></label>
       <button className="primary" type="submit" disabled={busy}><Link2 size={17}/>Generar enlace privado</button>
     </form>
     {link&&<div className="team-created-link"><label>Enlace de invitación<input type="text" readOnly value={link} onFocus={e=>e.currentTarget.select()}/></label><button className="secondary" type="button" onClick={()=>void copy()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar enlace'}</button></div>}
     {invites.filter(i=>!i.accepted_at&&!i.revoked_at&&Date.parse(i.expires_at)>Date.now()).length>0&&<div className="team-invites"><h4><Clock3 size={16}/> Invitaciones pendientes</h4>{invites.filter(i=>!i.accepted_at&&!i.revoked_at&&Date.parse(i.expires_at)>Date.now()).map(i=><div key={i.id} className="team-invite-row"><span>{i.invite_email||'Enlace privado'} · {i.role==='editor'?'Editar':'Solo ver'}</span><button type="button" className="textbtn" disabled={busy} onClick={()=>void revoke(i.id)}>Revocar</button></div>)}</div>}
     {notice&&<p role="status" className="subtle">{notice}</p>}
   </div>}
   {!owner&&<div className="surface"><p className="subtle">Tu acceso puede ser retirado por el organizador. Para abandonar el viaje, volvé a Mis viajes y elegí «Salir del viaje».</p></div>}
   <div className="notice"><Eye size={17}/> <span>Los miembros pueden ver las notas y los gastos privados de este viaje. Publicarlo en Explorar es una acción independiente que solo puede hacer el organizador.</span></div>
  </>}
 </section>;
}
