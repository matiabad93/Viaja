'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {cloudReady,logIn,register,logOut,sendRecovery,changePassword,recoveryPending,importLocalTrips,getSocialProviderAvailability,beginSocialSignIn,type ViajaSession} from '../lib/supabase-client';
import {unavailableSocialProviders,socialProviders,type SocialAvailability,type SocialProvider} from '../lib/social-auth';
import {UserRound,LogOut,CloudUpload,X,LoaderCircle} from 'lucide-react';

export function AccountControl({session,onReload,onError}:{session:ViajaSession|null;onReload:()=>Promise<void>;onError:(message:string)=>void}){
 const [open,setOpen]=useState(false);
 const [mode,setMode]=useState<'login'|'signup'|'recover'|'password'>('login');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [notice,setNotice]=useState('');
 const [working,setWorking]=useState(false);
 const [importing,setImporting]=useState(false);
 const [confirmImport,setConfirmImport]=useState(false);
 const [availableProviders,setAvailableProviders]=useState<SocialAvailability>(unavailableSocialProviders);
 const [socialStatusLoading,setSocialStatusLoading]=useState(false);
 const busy=working||importing;
 const triggerRef=useRef<HTMLButtonElement>(null);
 const dialogRef=useRef<HTMLElement>(null);
 const closeDialog=()=>{setOpen(false);triggerRef.current?.focus()};
 useEffect(()=>{if(!open||session)return;let active=true;setSocialStatusLoading(true);getSocialProviderAvailability().then(result=>{if(active)setAvailableProviders(result)}).finally(()=>{if(active)setSocialStatusLoading(false)});return()=>{active=false}},[open,session]);
 const signInSocial=(provider:SocialProvider)=>{
  if(!availableProviders[provider]||socialStatusLoading)return;
  try{setNotice('Redirigiendo a '+({google:'Gmail',facebook:'Facebook'}[provider])+'…');beginSocialSignIn(provider)}
  catch(e){setNotice(e instanceof Error?e.message:'No pudimos abrir el acceso social.')}
 };
 useEffect(()=>{
  if(!open)return;
  const originalOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();closeDialog();return;}
   if(event.key!=='Tab'||!dialogRef.current)return;
   const focusables=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
   if(!focusables.length)return;
   const first=focusables[0],last=focusables[focusables.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',onKeyDown);
  return ()=>{document.body.style.overflow=originalOverflow;document.removeEventListener('keydown',onKeyDown)};
 },[open]);
 const run=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;
  setWorking(true);setNotice('');
  try{
   if(mode==='login'){await logIn(email,password);await onReload();setOpen(false);}
   else if(mode==='signup'){
    const active=await register(email,password);
    if(active){await onReload();setOpen(false);}
    else setNotice('Si el correo es válido, recibirás un enlace de confirmación. Revisá también spam.');
   }else if(mode==='recover'){
    await sendRecovery(email);
    setNotice('Si existe una cuenta, te enviamos instrucciones para recuperar la contraseña.');
   }else{
    await changePassword(password);
    setNotice('Contraseña actualizada. Ya podés continuar usando tu cuenta.');
    setMode('login');
   }
  }catch(err){setNotice(err instanceof Error?err.message:'No pudimos completar la operación.');}
  finally{setWorking(false);}
 };
 async function importTrips(){
  if(!confirmImport){setConfirmImport(true);return;}
  setImporting(true);setNotice('');
  try{
   const data=await importLocalTrips();
   await onReload();
   setConfirmImport(false);
   setNotice(data.imported?data.imported+' viajes importados a tu cuenta.':'No se encontraron viajes nuevos para importar.');
  }catch(err){setNotice(err instanceof Error?err.message:'No se pudieron importar tus viajes.');onError('Los viajes locales siguen conservados.');}
  finally{setImporting(false);}
 }
 async function signOut(){
  setWorking(true);
  try{await logOut();await onReload();setOpen(false);}catch(err){onError(err instanceof Error?err.message:'Error al cerrar sesión.');}
  finally{setWorking(false);}
 }
 if(!cloudReady)return <span className="profile" title="Conexión de cuentas pendiente de configurar en Cloudflare">Cuentas pendientes</span>;
 return <div className="viaja-account">
  <button ref={triggerRef} type="button" className="viaja-account-trigger" onClick={()=>{setMode(recoveryPending()?'password':'login');setOpen(v=>!v);setNotice('');}} aria-expanded={open} aria-label={session?'Opciones de mi cuenta':'Iniciar sesión o registrarse'}>
   <UserRound size={16}/> {session?(session.user.email||'Mi cuenta'):'Entrar / Registrarme'}
  </button>
  {open&&typeof document!=='undefined'&&createPortal(<div className="viaja-account-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)closeDialog()}}>
   <section ref={dialogRef} className="viaja-account-dialog" role="dialog" aria-modal="true" aria-label={session?'Mi cuenta':'Acceder a Viaja'}>
    <button className="viaja-account-close" type="button" onClick={closeDialog} aria-label="Cerrar"><X size={20}/></button>
    {session?<><h2>Mi cuenta</h2><p className="viaja-account-subtitle">Sesión iniciada como <strong>{session.user.email||'usuario'}</strong>. Tus viajes se guardan en Supabase.</p>
      <button type="button" className="viaja-account-action" disabled={busy} onClick={importTrips}><CloudUpload size={17}/> Importar viajes anteriores de este dispositivo</button>
      {confirmImport&&<p className="viaja-account-help">Se conservará la copia local. Tocá «Importar» nuevamente para confirmar.</p>}
      <button type="button" className="viaja-account-action" disabled={busy} onClick={signOut}><LogOut size={17}/> Cerrar sesión</button>
    </>:<>
      <h2>{mode==='login'?'Iniciar sesión':mode==='signup'?'Crear una cuenta':mode==='recover'?'Recuperar contraseña':'Nueva contraseña'}</h2>
      <p className="viaja-account-subtitle">Tus viajes, calendario y gastos estarán disponibles cuando ingreses con tu cuenta.</p>
      {mode!=='password'&&mode!=='recover'&&<div className="viaja-social-auth">
        <div className="viaja-social-list" aria-label="Acceso con Gmail o Facebook">
          {socialProviders.map(provider=><button
            key={provider}
            type="button"
            className={'viaja-social-provider viaja-social-'+provider}
            disabled={busy||socialStatusLoading||!availableProviders[provider]}
            aria-label={'Continuar con '+({google:'Gmail',facebook:'Facebook'}[provider])+(availableProviders[provider]?'':' (pendiente de habilitar)')}
            title={availableProviders[provider]?'Continuar con '+provider:'Proveedor pendiente de configurar en Supabase'}
            onClick={()=>signInSocial(provider)}
          >
            <span className="viaja-social-provider-icon" aria-hidden="true">{provider==='google'?<span className="viaja-google-g">G</span>:<span className="viaja-facebook-f">f</span>}</span>
            <span>{provider==='google'?'Gmail':'Facebook'}</span>
            {!availableProviders[provider]&&<small>{socialStatusLoading?'Comprobando…':'Próximamente'}</small>}
          </button>)}
        </div>
        <p className="viaja-social-explainer">Gmail utiliza el inicio de sesión seguro de Google. Viaja no accede a tus mensajes ni a tu bandeja de entrada.</p>
        <div className="viaja-social-separator"><span>o continuá con tu correo</span></div>
      </div>}
      <form onSubmit={run}>
       {mode!=='password'&&<label>Correo electrónico<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com"/></label>}
       {mode!=='recover'&&<label>{mode==='password'?'Contraseña nueva':'Contraseña'}<input type="password" required minLength={8} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
       <button className="viaja-account-submit" type="submit" disabled={busy}>{working&&<LoaderCircle size={16} className="spin"/>}{mode==='login'?'Entrar':mode==='signup'?'Registrarme':mode==='recover'?'Enviar instrucciones':'Actualizar contraseña'}</button>
      </form>
      <div className="viaja-account-links">
       {mode!=='login'&&<button type="button" onClick={()=>{setMode('login');setNotice('')}}>Ya tengo una cuenta</button>}
       {mode!=='signup'&&<button type="button" onClick={()=>{setMode('signup');setNotice('')}}>Crear cuenta</button>}
       {mode==='login'&&<button type="button" onClick={()=>{setMode('recover');setNotice('')}}>Olvidé mi contraseña</button>}
      </div>
    </>}
    {notice&&<p className="viaja-account-notice" role="status">{notice}</p>}
    <p className="viaja-account-help">No compartas tu contraseña. La cuenta pertenece a Viaja y utiliza Supabase Auth.</p>
   </section>
  </div>,document.body)}
 </div>;
}
