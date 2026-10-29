'use client';
import {useState} from 'react';
import {cloudReady,logIn,register,logOut,sendRecovery,changePassword,recoveryPending,importLocalTrips,type ViajaSession} from '../lib/supabase-client';
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
 const busy=working||importing;
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
  <button type="button" className="viaja-account-trigger" onClick={()=>{setMode(recoveryPending()?'password':'login');setOpen(v=>!v);setNotice('');}} aria-expanded={open} aria-label={session?'Opciones de mi cuenta':'Iniciar sesión o registrarse'}>
   <UserRound size={16}/> {session?(session.user.email||'Mi cuenta'):'Entrar / Registrarme'}
  </button>
  {open&&<div className="viaja-account-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <section className="viaja-account-dialog" role="dialog" aria-modal="true" aria-label={session?'Mi cuenta':'Acceder a Viaja'}>
    <button className="viaja-account-close" type="button" onClick={()=>setOpen(false)} aria-label="Cerrar"><X size={20}/></button>
    {session?<><h2>Mi cuenta</h2><p className="viaja-account-subtitle">Sesión iniciada como <strong>{session.user.email||'usuario'}</strong>. Tus viajes se guardan en Supabase.</p>
      <button type="button" className="viaja-account-action" disabled={busy} onClick={importTrips}><CloudUpload size={17}/> Importar viajes anteriores de este dispositivo</button>
      {confirmImport&&<p className="viaja-account-help">Se conservará la copia local. Tocá «Importar» nuevamente para confirmar.</p>}
      <button type="button" className="viaja-account-action" disabled={busy} onClick={signOut}><LogOut size={17}/> Cerrar sesión</button>
    </>:<>
      <h2>{mode==='login'?'Iniciar sesión':mode==='signup'?'Crear una cuenta':mode==='recover'?'Recuperar contraseña':'Nueva contraseña'}</h2>
      <p className="viaja-account-subtitle">Tus viajes, calendario y gastos estarán disponibles cuando ingreses con tu cuenta.</p>
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
  </div>}
 </div>;
}
