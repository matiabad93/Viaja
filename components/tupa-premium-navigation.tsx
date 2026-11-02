'use client';
import {useState} from 'react';
import {CalendarDays,Compass,Home,Menu,UserRound,Suitcase,X} from 'lucide-react';
export type TupaTab='home'|'planner'|'saved'|'detail'|'guides'|'profile'|'admin';
type Tab=TupaTab;
const links:{tab:Tab;label:string;short:string;Icon:typeof Home}[]=[
 {tab:'home',label:'Inicio',short:'Inicio',Icon:Home},
 {tab:'planner',label:'Planificar',short:'Planificar',Icon:CalendarDays},
 {tab:'saved',label:'Mis viajes',short:'Mis viajes',Icon:Suitcase},
 {tab:'guides',label:'Explorar',short:'Explorar',Icon:Compass},
 {tab:'profile',label:'Mi perfil',short:'Mi perfil',Icon:UserRound}
];
export function TupaPremiumNavigation({active,onNavigate,tripCount}:{active:Tab;onNavigate:(tab:Tab)=>void;tripCount:number}){
 const [open,setOpen]=useState(false);
 const navigate=(tab:Tab)=>{onNavigate(tab);setOpen(false)};
 const selected=active==='detail'?'saved':active;
 return <>
  <header className="tupa-premium-header">
   <div className="tupa-header-inner">
    <button className="tupa-mobile-menu-button" type="button" aria-label={open?'Cerrar menú':'Abrir menú'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={24}/>:<Menu size={24}/>}</button>
    <button type="button" className="tupa-brand-lockup" onClick={()=>navigate('home')} aria-label="Tupã Travel - ir a Inicio">
     <img src="/tupa-premium-emblem.svg" alt="" width="60" height="60"/>
     <span><strong>Tupã</strong><small>TRAVEL</small></span>
    </button>
    <nav className="tupa-desktop-nav" aria-label="Navegación principal">
     {links.map(({tab,label,Icon})=><button type="button" key={tab} className={selected===tab?'active':''} aria-current={selected===tab?'page':undefined} onClick={()=>navigate(tab)}><Icon size={17}/>{label}{tab==='saved'&&tripCount>0&&<small>{tripCount}</small>}</button>)}
    </nav>
    <a className="tupa-header-contact" href="https://www.instagram.com/tupatravel/" target="_blank" rel="noopener noreferrer">Contactar <span aria-hidden="true">↗</span></a>
   </div>
   {open&&<nav className="tupa-mobile-expanded" aria-label="Menú principal">{links.map(({tab,label,Icon})=><button type="button" onClick={()=>navigate(tab)} key={tab}><Icon size={19}/>{label}</button>)}</nav>}
  </header>
  <nav className="tupa-bottom-nav" aria-label="Navegación móvil">{links.map(({tab,short,Icon})=><button key={tab} type="button" onClick={()=>navigate(tab)} aria-current={selected===tab?'page':undefined} className={selected===tab?'active':''}><Icon size={23} strokeWidth={1.7}/><span>{short}</span></button>)}</nav>
 </>;
}
