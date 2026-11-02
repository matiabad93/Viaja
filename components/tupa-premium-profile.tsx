'use client';
import {useEffect,useState} from 'react';
import {UserRound,ShieldCheck,Download,Briefcase,HeartHandshake,ExternalLink,Check} from 'lucide-react';
import type {Plan} from '../lib/travel';
export function TupaPremiumProfile({plans,onOpenTrips}:{plans:Plan[];onOpenTrips:()=>void}){
 const [name,setName]=useState('');
 const [saved,setSaved]=useState(false);
 useEffect(()=>{try{setName(localStorage.getItem('tupa-profile-name-v1')||'')}catch{}},[]);
 const persist=()=>{try{localStorage.setItem('tupa-profile-name-v1',name.slice(0,70));setSaved(true)}catch{setSaved(false)}};
 const download=()=>{
  const file=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),app:'Tupã Travel',trips:plans},null,2)],{type:'application/json'});
  const href=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=href;a.download='tupa-travel-mis-viajes.json';a.click();
  window.setTimeout(()=>URL.revokeObjectURL(href),5000);
 };
 return <section className="tupa-profile-page">
  <div className="tupa-section-kicker">TU ESPACIO PERSONAL</div><h1>Tu mundo, a tu manera.</h1><p>Personalizá tu experiencia y conservá tus rutas favoritas.</p>
  <div className="tupa-profile-grid">
   <article className="tupa-profile-card">
    <div className="tupa-profile-avatar"><UserRound size={32}/></div><h2>Tu perfil de viaje</h2>
    <p>Tu nombre se guarda en este dispositivo. Todavía no es una cuenta sincronizada.</p>
    <label htmlFor="tupa-profile-name">Cómo querés que te llamemos</label>
    <input id="tupa-profile-name" maxLength={70} placeholder="Tu nombre" value={name} onChange={e=>{setName(e.target.value);setSaved(false)}}/>
    <button type="button" className="tupa-gold-btn" onClick={persist}>{saved?<Check size={18}/>:<UserRound size={18}/>} {saved?'Preferencia guardada':'Guardar preferencia'}</button>
   </article>
   <article className="tupa-profile-card">
    <div className="tupa-profile-avatar"><Briefcase size={32}/></div><h2>Tus itinerarios</h2>
    <p>Tenés <strong>{plans.length}</strong> {plans.length===1?'viaje guardado':'viajes guardados'} en este navegador.</p>
    <button type="button" className="tupa-outline-btn" onClick={onOpenTrips}><Briefcase size={18}/>Ver mis viajes</button>
    <button type="button" className="tupa-outline-btn" onClick={download}><Download size={18}/>Exportar mis viajes (JSON)</button>
   </article>
   <article className="tupa-profile-card">
    <div className="tupa-profile-avatar"><ShieldCheck size={32}/></div><h2>Privacidad de tus viajes</h2>
    <p>En esta primera versión los viajes se guardan localmente en el navegador. Si borrás los datos del sitio o cambiás de dispositivo, pueden perderse. Exportalos para conservar una copia.</p>
    <div className="tupa-profile-safe"><ShieldCheck size={18}/> Sin conexión a la base de datos de Viaja</div>
   </article>
   <article className="tupa-profile-card">
    <div className="tupa-profile-avatar"><HeartHandshake size={32}/></div><h2>¿Necesitás ayuda?</h2>
    <p>Contactá con el equipo de Tupã Travel para consultas comerciales sobre viajes y experiencias.</p>
    <a className="tupa-outline-btn" href="https://tupatravel.com.ar/" target="_blank" rel="noopener noreferrer">Web de Tupã Travel <ExternalLink size={17}/></a>
    <a className="tupa-outline-btn" href="https://www.instagram.com/tupatravel/" target="_blank" rel="noopener noreferrer">Instagram <ExternalLink size={17}/></a>
   </article>
  </div>
 </section>;
}
