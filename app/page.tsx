'use client';
import {requestAPI} from '../lib/api-client';
import {AccountControl} from '../components/account-control';
import {cloudReady,restoreAuth,subscribeAuth,getCurrentSession,accessToken,listCloudTrips,saveCloudTrip,deleteCloudTrip,type ViajaSession} from '../lib/supabase-client';
import {TripStopsEditor} from '../components/trip-stops-editor';
import {DestinationSearch} from '../components/destination-search';
import {cityLabel} from '../lib/city-suggestions';
import {reviewItineraryFeasibility} from '../lib/trip-feasibility';
import {TripDateRange} from '../components/trip-date-range';
import {todayLocal,isoFromDate} from '../lib/date-range';
import {parisDemo} from '../lib/demo-plan';
import {newId,backup} from '../lib/travel';
import {useEffect,useState,useRef,Fragment} from 'react';
import {ArrowUpRight,ArrowRight,MapPin,Compass,CalendarDays,Users,Wallet,Bookmark,Globe,Check,Link2,ChevronRight,Download,LoaderCircle,Plus,TrainFront,BookOpen,Sparkles,RotateCcw} from 'lucide-react';
import {Guides,TripTools} from '../components/travel-hub';
import {Trip,Plan,itineraryOf,daysCount} from '../lib/travel';
import {TripsDashboard} from '../components/trips-dashboard';
import {ConfirmDialog} from '../components/confirm-dialog';
import {TripDetail} from '../components/trip-detail';
import {CommunityTrips} from '../components/community-trips';
import {acceptTripInvite,removeTripMember,fetchTripUpdate} from '../lib/trip-collaboration';
import {listMyCommunityTrips,publishCommunityTrip,unpublishCommunityTrip} from '../lib/supabase-client';
import {publicTripSnapshot} from '../lib/community-trips';
const empty:Trip={destination:'',additionalDestinations:[],origin:'',start:'',end:'',travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official','blogs','forums','youtube']};
const sourceNames:Record<string,string>={official:'Sitios oficiales',blogs:'Blogs de viajes',forums:'Foros y comunidades',youtube:'YouTube',tiktok:'TikTok'};
const storageKey='viaja-ai-trips-v1';const safeURL=(url:string)=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?url:null}catch{return null}};
function readableDate(date:string){return new Date(date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
function Citations({part}:{part:NonNullable<Plan['parts']>[number]}){let position=0;const chunks:React.ReactNode[]=[];for(const a of [...part.annotations].sort((a,b)=>a.start-b.start)){if(!Number.isInteger(a.start)||!Number.isInteger(a.end)||a.start<position||a.end<=a.start||a.end>part.text.length||!safeURL(a.url))continue;chunks.push(part.text.slice(position,a.start));chunks.push(<a key={`${a.start}-${a.url}`} href={a.url} target="_blank" rel="noopener noreferrer" className="citation" title={a.title}>[{new URL(a.url).hostname.replace('www.','')}]</a>);position=a.end}chunks.push(part.text.slice(position));return <div className="reportText">{chunks.map((s,i)=><Fragment key={i}>{s}</Fragment>)}</div>}
export default function Home(){const [admin,setAdmin]=useState(false);const [session,setSession]=useState<ViajaSession|null>(null);const [aiStatusReason,setAiStatusReason]=useState('');const [authLoaded,setAuthLoaded]=useState(!cloudReady);const [tab,setTab]=useState('guides'),[editingTrip,setEditingTrip]=useState(false),[trip,setTrip]=useState<Trip>(empty),[plans,setPlans]=useState<Plan[]>([]),[result,setResult]=useState<Plan|null>(null),[ready,setReady]=useState<boolean|null>(null),[statusError,setStatusError]=useState(false),[aiMode,setAiMode]=useState('researched'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState(false);const formRef=useRef<HTMLFormElement>(null);const abortRef=useRef<AbortController|null>(null);
const [pendingDeletion,setPendingDeletion]=useState<Plan|null>(null),[deleting,setDeleting]=useState(false);
const [pendingRegeneration,setPendingRegeneration]=useState(false);
const [publicationIds,setPublicationIds]=useState<Record<string,string>>({});
const [pendingPublish,setPendingPublish]=useState<Plan|null>(null);
const [pendingUnpublish,setPendingUnpublish]=useState<Plan|null>(null);
const [publicationBusy,setPublicationBusy]=useState(false);
const [exploreMode,setExploreMode]=useState<'guides'|'community'>(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('viaje')?'community':'guides');
const [sharedLinkId]=useState(()=>typeof window!=='undefined'?new URLSearchParams(window.location.search).get('viaje')||'':'');
const [guideTarget,setGuideTarget]=useState<string|null>(null);
const [guideNavigationId,setGuideNavigationId]=useState(0);
const [invitationToken]=useState(()=>typeof window!=='undefined'?new URLSearchParams(window.location.search).get('invitacion')||'':'');
const [invitationDone,setInvitationDone]=useState(false);
const inviteHandledRef=useRef(false);
const [remoteChanges,setRemoteChanges]=useState(false);
const saveQueueRef=useRef<Record<string,Promise<number>>>({});
const currentTrip=plans.find(p=>p.id===result?.id)||result;
const refreshActiveTrip=async()=>{
 const updated=await listCloudTrips();
 setPlans(updated);
 const match=updated.find(p=>p.id===result?.id);
 if(match){delete saveQueueRef.current[match.id];setResult(match);setTrip(match.trip);setRemoteChanges(false);}
};
useEffect(()=>{
 if(!session||tab!=='detail'||!currentTrip?.collaboration)return;
 let active=true;
 const check=async()=>{try{
   const updated=await fetchTripUpdate(currentTrip.id);
   if(active&&updated?.collaboration&&updated.collaboration.version>(currentTrip.collaboration?.version||0))setRemoteChanges(true);
 }catch{/* Do not replace unsaved local changes if network is unavailable. */}};
 const timer=setInterval(()=>void check(),18000);
 return()=>{active=false;clearInterval(timer)};
},[session?.user.id,tab,currentTrip?.id,currentTrip?.collaboration?.version]);
const showGuide=(id?:string)=>{setExploreMode('guides');setGuideTarget(id||null);setGuideNavigationId(n=>n+1);setTab('guides');setError('');window.scrollTo(0,0)};
const statusRequestRef=useRef(0);const checkStatus=async()=>{const requestId=++statusRequestRef.current;setReady(null);setStatusError(false);try{const token=await accessToken();const r=await requestAPI('/api/status',{headers:token?{Authorization:'Bearer '+token}:{}});if(!r.ok)throw Error();const j=await r.json() as {ready?:boolean;admin?:boolean;mode?:string;reason?:string};if(requestId!==statusRequestRef.current)return;setAdmin(j.admin===true);setReady(j.ready===true);setAiMode(j.mode||'researched');setAiStatusReason(j.reason||'')}catch{if(requestId===statusRequestRef.current){setStatusError(true);setAiStatusReason('connection_failed')}}};
const loadLocal=()=>{try{const raw=JSON.parse(localStorage.getItem(storageKey)||'[]');setPlans(Array.isArray(raw)?raw.filter(p=>p&&p.trip&&p.id):[]);const draft=localStorage.getItem('viaja-ai-current');if(draft)setTrip({...empty,...JSON.parse(draft)})}catch{setMessage('No pudimos recuperar los viajes guardados. Podés crear uno nuevo.')}};
const reloadAccount=async()=>{const current=getCurrentSession();setSession(current);await checkStatus();if(current){
 if(invitationToken&&!inviteHandledRef.current){
  inviteHandledRef.current=true;
  try{
   await acceptTripInvite(invitationToken);
   setInvitationDone(true);
   const url=new URL(window.location.href);url.searchParams.delete('invitacion');window.history.replaceState({},'',url.pathname+url.search+url.hash);
   setMessage('¡Ya sos parte del equipo! Tu viaje aparece en Mis viajes.');
   setTab('saved');
  }catch(e){setError('No pudimos aceptar esta invitación: '+(e instanceof Error?e.message:'enlace inválido o vencido'));}
 }
 const [savedTrips,publications]=await Promise.all([listCloudTrips(),listMyCommunityTrips()]);
 setPlans(savedTrips);setPublicationIds(publications);
 setResult(old=>old?savedTrips.find(x=>x.id===old.id)||old:old);
 if(!invitationToken)setMessage('Tus viajes están sincronizados con tu cuenta.');
 }else{setPublicationIds({});loadLocal();setMessage('Sesión cerrada. Tus viajes de invitado siguen en este dispositivo.')}};
useEffect(()=>{checkStatus();let mounted=true;const unsubscribe=subscribeAuth(s=>{if(mounted)setSession(s)});if(!cloudReady){loadLocal();setAuthLoaded(true)}else{restoreAuth().then(async()=>{if(!mounted)return;await reloadAccount()}).catch(e=>{if(mounted){setError('No pudimos sincronizar tu cuenta: '+(e instanceof Error?e.message:'error de conexión')+'. Reintentá al ingresar.');if(!getCurrentSession())loadLocal()}}).finally(()=>{if(mounted)setAuthLoaded(true)})}return()=>{mounted=false;unsubscribe();abortRef.current?.abort()}},[]);
useEffect(()=>{const back=(e:Event)=>{if(tab!=='guides'){e.preventDefault();setTab(tab==='detail'?'saved':'guides')}};window.addEventListener('viaja-back',back);return()=>window.removeEventListener('viaja-back',back)},[tab]);
const update=(key:keyof Trip,value:any)=>{setTrip(t=>({...t,[key]:value}));setSaved(false)};
const save=(p:Plan)=>{
 if(session&&p.collaboration?.role==='viewer'){setError('Tenés acceso de solo lectura. Pedile permiso de edición al organizador.');return false;}
 const next=[p,...plans.filter(x=>x.id!==p.id)];
 if(session){
  setPlans(next);setSaved(false);setMessage('Guardando en tu cuenta…');setError('');
  const prior=saveQueueRef.current[p.id]||Promise.resolve(p.collaboration?.version??0);
  const task=prior.then(version=>saveCloudTrip({...p,collaboration:version?{
   version,ownerId:p.collaboration?.ownerId||session.user.id,
   role:p.collaboration?.role||'owner',memberCount:p.collaboration?.memberCount||1
  }:undefined}));
  saveQueueRef.current[p.id]=task;
  task.then(version=>{
   const info={version,ownerId:p.collaboration?.ownerId||session.user.id,
    role:p.collaboration?.role||'owner' as const,memberCount:p.collaboration?.memberCount||1};
   setPlans(current=>current.map(x=>x.id===p.id?{...x,collaboration:info}:x));
   setResult(current=>current?.id===p.id?{...current,collaboration:info}:current);
   setSaved(true);setMessage('Cambios guardados para todo el equipo.');
  }).catch(e=>{
   const detail=e instanceof Error?e.message:'error de red';
   const conflict=/TRIP_CONFLICT|version|conflict/i.test(detail);
   setRemoteChanges(conflict);
   setError(conflict?'Alguien actualizó este viaje antes que vos. Descargá tu copia y cargá los cambios nuevos para evitar sobrescribirlos.':'No se pudo sincronizar el viaje: '+detail+'. Conservá una copia hasta reintentar.');
   setSaved(false);
  });
  return true;
 }
 try{localStorage.setItem(storageKey,JSON.stringify(next));setPlans(next);setSaved(true);setMessage('Cambios guardados en este navegador.');setError('');return true}
 catch{setError('No pudimos guardar los cambios. Exportá el viaje para conservarlo.');return false}
};
const openTrip=(p:Plan,edit=false)=>{setRemoteChanges(false);setResult(p);setTrip(p.trip);setEditingTrip(edit);setTab('detail');setError('');setMessage('');window.scrollTo(0,0)};
const newTrip=()=>{setResult(null);setTrip(empty);setTab('planner');setMessage('');setError('');window.scrollTo(0,0)};
const deleteTrip=(p:Plan)=>{setPendingDeletion(p)};
const requestPublish=(p:Plan)=>{
 if(!session||(p.collaboration?.role&&p.collaboration.role!=='owner')){setError('Solo el organizador puede publicar un itinerario. Para publicar un viaje, primero iniciá sesión y guardalo en tu cuenta. Tus viajes locales siguen siendo privados.');window.scrollTo(0,0);return;}
 try{publicTripSnapshot(p);setPendingPublish(p);setError('')}
 catch(e){setError(e instanceof Error?e.message:'No se pudo preparar la publicación.');window.scrollTo(0,0)}
};
const confirmPublish=async()=>{
 const p=pendingPublish;if(!p||publicationBusy)return;
 setPublicationBusy(true);
 try{
  const result=await publishCommunityTrip(p);
  setPublicationIds(current=>({...current,[p.id]:result.id}));
  setPendingPublish(null);setMessage('Tu itinerario ya aparece en Explorar destinos → Viajes compartidos.');
  setError('');
 }catch(e){setError(e instanceof Error?'No pudimos publicar: '+e.message:'Error al publicar el viaje.');setPendingPublish(null)}
 finally{setPublicationBusy(false)}
};
const confirmUnpublish=async()=>{
 const p=pendingUnpublish;if(!p||publicationBusy)return;
 setPublicationBusy(true);
 try{
  await unpublishCommunityTrip(p.id);
  setPublicationIds(current=>{const next={...current};delete next[p.id];return next});
  setPendingUnpublish(null);setMessage('Tu itinerario dejó de estar publicado. Las copias ya guardadas por otros usuarios no se eliminan.');setError('');
 }catch(e){setError(e instanceof Error?'No pudimos retirar la publicación: '+e.message:'No se pudo retirar la publicación.');setPendingUnpublish(null)}
 finally{setPublicationBusy(false)}
};
const copyCommunityTrip=(draft:Plan)=>{
 if(save(draft)){openTrip(draft,true);setMessage('Guardaste una copia independiente. Elegí tus propias fechas y ciudad de salida antes de viajar.');}
};
const confirmDeleteTrip=async()=>{const p=pendingDeletion;if(!p||deleting)return;setDeleting(true);try{if(session){if(p.collaboration?.role&&p.collaboration.role!=='owner')await removeTripMember(p.id,session.user.id);else await deleteCloudTrip(p.id)}else{localStorage.setItem(storageKey,JSON.stringify(plans.filter(x=>x.id!==p.id))) }setPlans(current=>current.filter(x=>x.id!==p.id));setPublicationIds(current=>{const next={...current};delete next[p.id];return next});setResult(null);setTab('saved');setMessage(p.collaboration?.role&&p.collaboration.role!=='owner'?'Saliste de este viaje compartido.':'Viaje eliminado correctamente.');setPendingDeletion(null)}catch(e){setError('No se pudo eliminar el viaje: '+(e instanceof Error?e.message:'error de conexión'))}finally{setDeleting(false)}};
const saveDraft=()=>{setError('');setMessage('');
 if((trip.additionalDestinations||[]).some(x=>!x.trim())){setError('Completá o quitá los destinos adicionales vacíos.');return}
 const review=reviewItineraryFeasibility(trip);if(review.blocking.length){setError(review.blocking.join(' '));return}
 if(!trip.destination.trim()){setError('Elegí un destino para crear el viaje.');return}
 if(!trip.origin.trim()){setError('Indicá la ciudad de salida.');return}
 if(!trip.start||!trip.end){setError('Elegí la fecha de salida y la de regreso.');return}
 if(trip.end<trip.start){setError('La fecha de regreso no puede ser anterior a la salida.');return}
 if(daysCount(trip)>366){setError('Para crear un viaje manual, elegí hasta 366 días.');return}
 if(!Number.isInteger(trip.travelers)||trip.travelers<1||trip.travelers>12){setError('Indicá entre 1 y 12 viajeros.');return}
 if(!Number.isFinite(trip.budget)||trip.budget<0||trip.budget>1000000){setError('Ingresá un presupuesto válido o dejalo vacío.');return}
 const itinerary=result?.itinerary||Array.from({length:daysCount(trip)},(_,i)=>({id:newId(),title:'Día '+(i+1)+' · Por organizar',activities:[]}));
 const p:Plan=result?{...result,trip:{...trip},itinerary}:{id:newId(),trip:{...trip},kind:'draft',createdAt:new Date().toISOString(),itinerary,expenses:[]};
 if(save(p)){openTrip(p);setMessage('Viaje creado sin IA. Ahora podés agregar actividades a cada día y registrar tus gastos.')}
};
const example=()=>{const friday=new Date();friday.setDate(friday.getDate()+((5-friday.getDay()+7)%7||7));const sunday=new Date(friday);sunday.setDate(sunday.getDate()+2);setResult(null);setTrip({...empty,destination:'Madrid, España',additionalDestinations:[],start:isoFromDate(friday),end:isoFromDate(sunday),notes:'Tres días en Madrid sin coche: centro histórico, Plaza Mayor, Palacio Real, Retiro, Prado, barrios con tapas y paseos caminando por zonas contiguas.'});setError('');setMessage('Ejemplo de Madrid cargado. Podés cambiar la ciudad de salida, agregar destinos y ajustar presupuesto.');setSaved(false)};
const performGeneration=async()=>{if(busy)return;const draft:Plan=result?{...result,trip:{...trip}}:{id:newId(),trip:{...trip},kind:'draft',createdAt:new Date().toISOString()};if(!save(draft))return;setResult(draft);setBusy(true);const snapshot={...trip,sources:[...trip.sources]};const controller=new AbortController();abortRef.current=controller;try{localStorage.setItem('viaja-ai-current',JSON.stringify(snapshot))}catch{}const timeout=setTimeout(()=>controller.abort(),165000);try{const token=await accessToken();if(!token)throw Error('Iniciá sesión con Gmail para investigar tu viaje con IA.');const r=await requestAPI('/api/plan',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(snapshot),signal:controller.signal});const data=await r.json() as Plan & {error?:string;code?:string};if(!r.ok)throw Error((data.error||'No se pudo preparar el viaje.')+(data.code?' [Código: '+data.code+']':''));data.trip={...data.trip,city:snapshot.city};const next:Plan={...draft,...data,id:draft.id,expenses:draft.expenses,itinerary:data.itinerary};if(!itineraryOf(next).some(d=>d.activities.length))throw Error("La investigación no devolvió actividades organizadas. Tu viaje sigue guardado; podés reintentar o completarlo manualmente.");if(save(next)){openTrip(next);setMessage(data.kind==='draft'?'Ideas con Gemini guardadas. Verificá todos los datos antes de reservar.':'Investigación guardada. Revisá las fuentes antes de reservar.')}else{setResult(next);setTrip(next.trip);setTab('detail')}}catch(e){setError(e instanceof Error&&e.name==='AbortError'?'La investigación se interrumpió. Conservamos los datos del viaje.':e instanceof Error?e.message:'No se pudo generar el plan.')}finally{clearTimeout(timeout);setBusy(false);abortRef.current=null}};
const generate=(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setError('');setMessage('');
 if((trip.additionalDestinations||[]).some(x=>!x.trim())){setError('Completá los destinos adicionales o quitá los campos vacíos.');return}
 const feasibility=reviewItineraryFeasibility(trip);if(feasibility.blocking.length){setError(feasibility.blocking.join(' '));return}if(!trip.destination.trim()||!trip.origin.trim()||!trip.start||!trip.end||!Number.isInteger(trip.travelers)||trip.travelers<1||trip.travelers>12){setError('Completá destino, ciudad de salida, fechas y viajeros antes de usar la IA.');return}if(trip.end<trip.start){setError('El regreso debe ser posterior o igual a la salida.');return}if((Date.parse(trip.end)-Date.parse(trip.start))/86400000>30){setError('Por ahora, planificamos viajes de hasta 31 días.');return}if(aiMode!=='ideas_without_search'&&!trip.sources.length){setError('Seleccioná al menos un tipo de fuente.');return}if(result&&(Boolean(result.parts?.length)||itineraryOf(result).some(day=>day.activities.length>0))){
 setPendingRegeneration(true);
 return;
}
void performGeneration();};
const confirmRegeneration=()=>{
 if(busy||!pendingRegeneration)return;
 setPendingRegeneration(false);
 void performGeneration();
};
const feasibilityReview=reviewItineraryFeasibility(trip);
const exportPlan=(p:Plan)=>{const data=`# Viaja · ${p.trip.destination}\n\n${p.trip.start} → ${p.trip.end}\nSalida: ${p.trip.origin}\nRecorrido: ${[p.trip.destination,...(p.trip.additionalDestinations||[])].join(' → ')}\nViajeros: ${p.trip.travelers}\nPresupuesto para gastos diarios: ${p.trip.budget>0?p.trip.budget+' EUR':'Sin definir'} (excluye vuelos y alojamiento; registro manual)\nEstado: ${p.kind==='researched'?'Investigado con IA':'Borrador sin investigar'}\nFecha: ${p.createdAt}\n\n${p.parts?.map(x=>x.text).join('\n\n')||p.trip.notes}\n\n## Fuentes\n${p.sources?.map(s=>`- ${s.title}: ${s.url}`).join('\n')||'Sin fuentes consultadas.'}`;const url=URL.createObjectURL(new Blob([data],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='viaja-itinerario.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)};
return <><a className="skip-link" href="#main-content">Saltar al contenido</a><header className="topbar"><a href="/" className="logo">viaja<span>.</span></a><nav aria-label="Navegación principal"><button className={tab==='planner'?'navactive':''} onClick={()=>{setTab('planner');setError('');window.scrollTo(0,0)}}><Compass size={16}/>Planificar</button><button className={tab==='saved'||tab==='detail'?'navactive':''} onClick={()=>{setTab('saved');window.scrollTo(0,0)}}><Bookmark size={16}/>Mis viajes <small>{plans.length}</small></button><button className={tab==="guides"?"navactive":""} onClick={()=>showGuide()}><Globe size={16}/>Explorar destinos</button>{admin&&<button className={tab==="admin"?"navactive":""} onClick={()=>setTab("admin")}>Administración</button>}</nav><AccountControl session={session} onReload={reloadAccount} onError={setError}/></header><main id="main-content"><div className="global-feedback">{invitationToken&&!invitationDone&&<div className="team-invitation-banner" role="status"><Users size={19}/><span>{session?'Estamos comprobando tu invitación privada.':'Te invitaron a planificar un viaje en equipo. Iniciá sesión o registrate para aceptarla.'}</span></div>}{remoteChanges&&tab==='detail'&&currentTrip&&<div className="team-refresh-warning" role="status"><RotateCcw size={18}/><span>Hay cambios nuevos de otro colaborador. Descargá una copia si editaste algo antes de actualizar.</span><button type="button" className="secondary" onClick={()=>backup(currentTrip)}>Guardar copia</button><button type="button" className="primary" onClick={()=>void refreshActiveTrip()}>Ver últimos cambios</button></div>}{error&&<div role="alert" className="error">{error}</div>}{message&&<div role="status" className="message">{message}<button aria-label="Cerrar notificación" onClick={()=>setMessage('')}>×</button></div>}</div>
{!authLoaded?<p role="status" className="message">Comprobando tu sesión…</p>:tab==='detail'&&currentTrip?<TripDetail key={currentTrip.id} plan={currentTrip} initialEdit={editingTrip} onChange={p=>{if(save(p)){setResult(p);setTrip(p.trip);return true}return false}} onRefresh={refreshActiveTrip} onError={setError} onBack={()=>{setTab('saved');window.scrollTo(0,0)}} onAI={p=>{setTrip({...p.trip,adjustment:('Itinerario actual: '+itineraryOf(p).map((d,i)=>'Día '+(i+1)+': '+d.activities.map(a=>a.title).join(', ')).join('; ')).slice(0,650)+'\nCambios que quiero: '});setResult(p);setTab('planner')}} onDelete={()=>deleteTrip(currentTrip)} onPublish={requestPublish} onUnpublish={setPendingUnpublish} publishedId={publicationIds[currentTrip.id]} publicationBusy={publicationBusy} report={currentTrip.parts?.map((part,i)=><Citations key={i} part={part}/>)}/>:tab==='guides'?<section className="explore-all">
<div className="explore-switch" role="group" aria-label="Explorar destinos"><button type="button" aria-pressed={exploreMode==='community'} className={exploreMode==='community'?'active':''} onClick={()=>setExploreMode('community')}>Viajes compartidos</button><button type="button" aria-pressed={exploreMode==='guides'} className={exploreMode==='guides'?'active':''} onClick={()=>setExploreMode('guides')}>Guías de Viaja</button></div>
{exploreMode==='community'?<CommunityTrips onUse={copyCommunityTrip} initialId={sharedLinkId||undefined}/>:<Guides key={tab+'-'+guideNavigationId} initialGuideId={tab==='guides'?guideTarget||undefined:undefined} admin={false} onUse={g=>{if(g.id==='paris'){const demo=parisDemo(empty);if(save(demo))openTrip(demo);return}const p:Plan={id:newId(),trip:{...empty,destination:g.title,notes:'Itinerario editorial de 3 días. Adaptar a las fechas del viaje.'},kind:'draft',createdAt:new Date().toISOString(),parts:g.days.map((d,i)=>({text:'Día '+(i+1)+'\n'+d,annotations:[]})),sources:g.sources.map(url=>({url,title:'Fuente de la guía'}))};if(save(p))openTrip(p)}}/>}
</section>:tab==='admin'?<Guides key={tab+'-'+guideNavigationId} initialGuideId={undefined} admin={admin} onUse={g=>{if(g.id==='paris'){const demo=parisDemo(empty);if(save(demo))openTrip(demo);return}const p:Plan={id:newId(),trip:{...empty,destination:g.title,notes:'Itinerario editorial de 3 días. Adaptar a las fechas del viaje.'},kind:'draft',createdAt:new Date().toISOString(),parts:g.days.map((d,i)=>({text:'Día '+(i+1)+'\n'+d,annotations:[]})),sources:g.sources.map(url=>({url,title:'Fuente de la guía'}))};if(save(p))openTrip(p)}}/>:tab==='planner'?<><div className="intro"><div><div className="eyebrow"><span/>TU PRÓXIMA HISTORIA EMPIEZA ACÁ</div><h1>Vos elegís el destino.<br/><em>El viaje toma forma.</em></h1><p>Un plan a tu medida, con rutas, ideas y fuentes para decidir.<br/>De la primera inspiración al itinerario de cada día.</p></div><div className="inspiration"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Madrid_ciudad.jpg/1280px-Madrid_ciudad.jpg" alt="Vista panorámica de Madrid"/><div><span>INSPIRACIÓN SIN LÍMITES</span><strong>¿Y si esta vez<br/>vamos más allá?</strong><button onClick={example}>Probar con Madrid <ArrowUpRight size={17}/></button></div></div></div>
<div className="workspace"><form ref={formRef} onSubmit={generate} className="formcard">{error&&<div role="alert" className="error" style={{marginBottom:16}}>{error}</div>}<div className="formtitle"><div><span className="eyebrow">TU ASISTENTE DE VIAJES</span><h2>Contanos tu próximo viaje</h2></div><Compass size={27}/></div><fieldset disabled={busy}><div className="formgrid"><TripStopsEditor trip={trip} onChange={next=>{setTrip(next);setSaved(false)}}/><label className="wide">Ciudad de salida<div className="inputicon"><TrainFront size={17}/><DestinationSearch ariaLabel="Ciudad de salida" placeholder="Ej. Barcelona, España" value={trip.origin} onChange={v=>update('origin',v)} onSelect={c=>update('origin',cityLabel(c))}/></div></label><TripDateRange start={trip.start} end={trip.end} minStart={trip.start&&trip.start<todayLocal()?trip.start:todayLocal()} onChange={dates=>{setTrip(t=>({...t,...dates}));setSaved(false)}}/><label>Viajeros<div className="inputicon"><Users size={16}/><input required type="number" min={1} max={12} value={trip.travelers||''} onChange={e=>update('travelers',e.target.value===''?0:Number(e.target.value))}/></div></label><label>Presupuesto para gastos diarios (€) · opcional<div className="inputicon"><Wallet size={16}/><input type="number" min={1} max={1000000} step=".01" placeholder="Sin definir" value={trip.budget||''} onChange={e=>update('budget',e.target.value===''?0:Number(e.target.value))}/></div></label><p className="fieldhelp wide">Presupuesto del grupo para actividades, comidas y transporte local. No incluye vuelos ni alojamiento; podés registrarlos manualmente en Gastos.</p><label>Ritmo del viaje<select value={trip.pace} onChange={e=>update('pace',e.target.value)}><option>Tranquilo</option><option>Equilibrado</option><option>Intenso</option></select></label>{trip.pace==='Intenso'&&<p className="fieldhelp wide">Ritmo Intenso: más lugares y descripciones ampliadas en días completos, con rutas y consejos por jornada. Los días con vuelos o traslados tendrán menos actividades para respetar tus horarios. Son propuestas por verificar.</p>}<label>Cómo te movés<select value={trip.transport} onChange={e=>update('transport',e.target.value)}><option>Sin coche</option><option>Con coche</option><option>Indiferente</option></select></label><label className="wide">Describí tu viaje ideal en tus palabras<textarea maxLength={2000} rows={3} placeholder="Quiero pasar tres días tranquilos en Madrid, probar comida local y visitar pueblos sin alquilar coche…" value={trip.notes} onChange={e=>update('notes',e.target.value)}/></label></div>{trip.destination&&trip.start&&trip.end&&(feasibilityReview.blocking.length>0||feasibilityReview.warnings.length>0)&&<div className={'trip-feasibility '+(feasibilityReview.blocking.length?'blocked':'')} role="status"><strong>{feasibilityReview.blocking.length?'Este recorrido necesita ajustes':'Revisá la viabilidad antes de reservar'}</strong>{[...feasibilityReview.blocking,...feasibilityReview.warnings].map((note,i)=><p key={i}>{note}</p>)}<p>Los avisos son orientativos; no hemos consultado conexiones, precios ni horarios reales.</p></div>}
{aiMode!=='ideas_without_search'&&<details className="research-options"><summary>Personalizar fuentes de investigación</summary><div className="sourcepick"><span className="label">¿Dónde buscamos inspiración?</span><div className="chips">{Object.entries(sourceNames).map(([id,title])=><label key={id} className={trip.sources.includes(id)?'chip selected':'chip'}><input type="checkbox" checked={trip.sources.includes(id)} onChange={e=>update('sources',e.target.checked?[...trip.sources,id]:trip.sources.filter(s=>s!==id))}/>{trip.sources.includes(id)&&<Check size={12}/>} {title}</label>)}</div><p className="fieldhelp">La cobertura depende del contenido público accesible. Horarios y eventos se contrastan con fuentes oficiales.</p></div></details>}{aiMode!=='ideas_without_search'&&<details><summary><Link2 size={15}/>¿Guardaste un video o una recomendación?</summary><label className="linksLabel">Enlaces de referencia<textarea rows={3} maxLength={2000} placeholder="Pegá enlaces https de YouTube, TikTok, blogs o foros. Uno por línea." value={trip.links} onChange={e=>update('links',e.target.value)}/></label><p className="fieldhelp">Se intentará investigar su contenido accesible. Un enlace no garantiza acceso al video.</p></details>}{result&&<label className="adjust">¿Qué querés cambiar del plan?<p className="fieldhelp">La nueva investigación reemplazará la agenda de este viaje y conservará los gastos. Exportá antes si querés guardar una copia de tu agenda actual.</p><textarea maxLength={1000} rows={2} placeholder="Menos caminata, un día en Estrasburgo, un presupuesto menor…" value={trip.adjustment} onChange={e=>update('adjustment',e.target.value)}/></label>}
<div className="planning-actions"><button className="primary manual-plan" type="button" onClick={saveDraft} disabled={busy}><CalendarDays size={19}/> Crear mi viaje sin IA <ArrowRight size={18}/></button><p><strong>Gratis y sin límites de consultas.</strong> Creá tu agenda por días, agregá actividades, editá fechas y registrá gastos manualmente. Podés sumar IA más adelante.</p><button className="secondary ai-plan" type="submit" disabled={ready!==true||busy||feasibilityReview.blocking.length>0}>{busy?<LoaderCircle className="spin" size={18}/>:<Sparkles size={18}/>} {busy?'Preparando tu viaje…':result?'Recrear itinerario con IA':'Generar itinerario con IA'} {!busy&&<ArrowRight size={17}/>}</button>{ready!==true&&<p className="ai-unavailable">La IA requiere iniciar sesión y tener el servicio disponible. El botón «Crear mi viaje sin IA» funciona igualmente.</p>}</div></fieldset><div className="formfoot"><span>Sin reservas ni compras automáticas · Los gastos se agregan manualmente</span></div></form>
<aside className="resultarea"><div className={'connection '+(ready?'connected':'')}><span className="dot"/><div><strong>{ready===null&&!statusError?'Comprobando conexión…':statusError?'No pudimos comprobar la conexión':ready?aiMode==='ideas_without_search'?'Gemini disponible · ideas sin búsqueda web':'IA y búsqueda web disponibles':aiStatusReason==='configuration_incomplete'?'Falta configurar la IA en Cloudflare':aiStatusReason==='authentication_required'?'La sesión de IA necesita autenticación':'IA todavía no disponible'}</strong><p>{ready?(aiMode==='ideas_without_search'?'Gemini genera ideas orientativas sin buscar precios, horarios ni fuentes actuales. Propone varios puntos de interés por día agrupados por zonas; comprobá aperturas y recorridos antes de reservar.':'Cada consulta investigará fuentes para tus fechas.'):statusError?'Reintentá para comprobar el servicio.':aiStatusReason==='configuration_incomplete'?'Revisá las variables del entorno Preview de Cloudflare y volvé a desplegar; no pegues claves secretas en el navegador.':aiStatusReason==='authentication_required'?'Tu sesión no se validó en el servidor. Cerrá sesión y volvé a entrar con Gmail.':'Iniciá sesión para generar itinerarios con IA. También podés crear viajes completos sin IA, añadir actividades y registrar gastos.'}</p></div><button className="iconbtn" type="button" aria-label="Comprobar conexión" onClick={checkStatus}><RotateCcw size={16}/></button></div>
{busy&&<div className="loadingcard" role="status"><LoaderCircle size={24} className="spin"/><h3>{aiMode==='ideas_without_search'?'Preparando ideas para tu viaje':'Buscando un viaje que encaje con vos'}</h3><p>{aiMode==='ideas_without_search'?'Gemini está distribuyendo los imperdibles por días, agrupando zonas y proponiendo recorridos orientativos. No consulta horarios ni rutas en tiempo real.':'Consultando la web y preparando recomendaciones con fuentes.'}</p><button className="textbtn" type="button" onClick={()=>abortRef.current?.abort()}>Dejar de esperar</button></div>}

<><div className="emptyresult"><div className="compassart"><Compass size={70} strokeWidth={.8}/><span className="orb">✦</span></div><span className="eyebrow">DE UNA IDEA A UN PLAN</span><h2>Tu próxima aventura,<br/>con todo en su lugar.</h2><p>Elegí fechas y creá el viaje sin IA, o pedí ideas cuando tengas sesión.<br/>Tus actividades y gastos se guardan aunque no uses IA.</p><div className="outcomes"><div><CalendarDays size={19}/><span><strong>Un itinerario por día</strong><small>Actividades, tiempos y alternativas.</small></span></div><div><Wallet size={19}/><span><strong>Un presupuesto que se entiende</strong><small>Estimaciones separadas de precios confirmados.</small></span></div><div><BookOpen size={19}/><span><strong>Recomendaciones con contexto</strong><small>Fuentes visibles y límites de la investigación.</small></span></div></div></div><button type="button" className="example example-guide" aria-label="Abrir guía de Madrid imprescindible en Explorar destinos" onClick={()=>showGuide('madrid')}><span><span className="eyebrow">UNA GUÍA PARA EMPEZAR</span><strong className="example-title">Un finde en Madrid</strong><span className="example-subtitle">Centro, Retiro y arte · sin coche</span></span><span className="example-open" aria-hidden="true"><ArrowUpRight size={22}/></span></button></>
</aside></div></>:<TripsDashboard plans={plans} cloud={Boolean(session)} onNew={newTrip} onOpen={openTrip} onDelete={deleteTrip} onPublish={requestPublish} onUnpublish={setPendingUnpublish} publications={publicationIds} busy={publicationBusy}/>}

<ConfirmDialog open={!!pendingPublish} title={pendingPublish&&publicationIds[pendingPublish.id]?'¿Actualizar el itinerario público?':'¿Publicar este itinerario?'}
 description="Se compartirán el destino, la ruta, los títulos, descripciones y ubicaciones de las actividades, y los consejos de cada día. NO se publican gastos, reservas, fechas exactas, ciudad de salida, notas personales ni tu correo. Revisá las descripciones: podrían contener información que escribiste. Cualquier persona con el enlace podrá verlo y guardar una copia editable. Podés retirar la publicación cuando quieras."
 confirmLabel={pendingPublish&&publicationIds[pendingPublish.id]?'Actualizar itinerario público':'Sí, publicar itinerario'}
 busy={publicationBusy} onConfirm={confirmPublish} onCancel={()=>setPendingPublish(null)}/>
<ConfirmDialog open={!!pendingUnpublish} title="¿Retirar este viaje de la comunidad?"
 description="Dejará de aparecer en búsquedas y el enlace público dejará de funcionar. Las copias independientes que otros hayan guardado no podrán retirarse."
 confirmLabel="Sí, retirar publicación" danger busy={publicationBusy} onConfirm={confirmUnpublish} onCancel={()=>setPendingUnpublish(null)}/>
<ConfirmDialog
 open={pendingRegeneration}
 title="¿Recrear este itinerario con IA?"
 description="Se reemplazarán los días y actividades actuales por una nueva propuesta. Los gastos registrados se conservarán. Si querés guardar el itinerario anterior, exportalo antes de continuar."
 confirmLabel="Sí, recrear itinerario"
 danger={false}
 onConfirm={confirmRegeneration}
 onCancel={()=>setPendingRegeneration(false)}
/>
<ConfirmDialog open={!!pendingDeletion} title={pendingDeletion?.collaboration?.role&&pendingDeletion.collaboration.role!=='owner'?'¿Salir del viaje compartido?':'¿Eliminar este viaje?'} description={pendingDeletion?pendingDeletion.collaboration?.role&&pendingDeletion.collaboration.role!=='owner'?'Dejará de aparecer en tus viajes. El organizador y los demás integrantes conservarán sus cambios.':'Vas a eliminar “'+pendingDeletion.trip.destination+'” y todos sus gastos y actividades. Esta acción no se puede deshacer.':''} confirmLabel={pendingDeletion?.collaboration?.role&&pendingDeletion.collaboration.role!=='owner'?'Sí, salir del viaje':'Sí, eliminar viaje'} busy={deleting} onConfirm={confirmDeleteTrip} onCancel={()=>setPendingDeletion(null)}/></main><footer><span className="logo">viaja<span>.</span></span><p>Planificá con curiosidad. Viajá a tu ritmo.</p><small>En iPhone: Safari → Compartir → Añadir a pantalla de inicio. {session?'Viajes guardados en tu cuenta.':cloudReady?'Sin iniciar sesión, los viajes se guardan en este dispositivo.':'Sincronización en preparación.'} · <a href="/photo-credits.html">Créditos de fotos</a></small></footer></>}
