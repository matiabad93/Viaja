'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,Check,ChevronDown,Monitor,Moon,Sun} from 'lucide-react';
import {useTheme} from './theme-provider';
import type {ThemePreference} from '../../lib/theme-preference';
import {COMFORT_STORAGE_KEY,parseComfortPreference,type ComfortPreference} from '../../lib/comfort-preference';

const choices=[
 {value:'light' as const,label:'Claro',Icon:Sun},
 {value:'dark' as const,label:'Oscuro',Icon:Moon},
 {value:'system' as const,label:'Sistema',Icon:Monitor}
];

export function ThemeSwitcher(){
 const {preference,resolved,setPreference}=useTheme();
 const [open,setOpen]=useState(false);
 const [comfort,setComfort]=useState<ComfortPreference>('off');
 const menu=useRef<HTMLDivElement>(null);
 const root=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const sync=(raw:unknown)=>{
   const value=parseComfortPreference(raw);
   setComfort(value);document.documentElement.dataset.comfort=value;
  };
  try{sync(window.localStorage.getItem(COMFORT_STORAGE_KEY))}catch{sync('off')}
  const changed=(event:StorageEvent)=>{if(event.key===COMFORT_STORAGE_KEY)sync(event.newValue)};
  window.addEventListener('storage',changed);
  return()=>window.removeEventListener('storage',changed);
 },[]);
 const toggleComfort=()=>{
  const next=comfort==='on'?'off':'on';
  setComfort(next);document.documentElement.dataset.comfort=next;
  try{window.localStorage.setItem(COMFORT_STORAGE_KEY,next)}catch{}
  setOpen(false);trigger.current?.focus();
 };
 useEffect(()=>{if(open)menu.current?.querySelector<HTMLButtonElement>('[role^="menuitem"]')?.focus()},[open]);
 useEffect(()=>{
  if(!open)return;
  const handleOutside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false);};
  const handleKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')||[]);
    if(!items.length)return;
    const index=items.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault();items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
   }
  };
  document.addEventListener('pointerdown',handleOutside);
  document.addEventListener('keydown',handleKey);
  return()=>{document.removeEventListener('pointerdown',handleOutside);document.removeEventListener('keydown',handleKey)};
 },[open]);
 const ActiveIcon=resolved==='dark'?Moon:Sun;
 return <div className="theme-switcher" ref={root}>
  <button type="button" ref={trigger} className="theme-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={'Apariencia: '+choices.find(x=>x.value===preference)?.label} onClick={()=>setOpen(x=>!x)} title="Cambiar apariencia">
   <ActiveIcon size={18} strokeWidth={1.8} aria-hidden="true"/><span>Apariencia</span><ChevronDown size={14} aria-hidden="true"/>
  </button>
  {open&&<div ref={menu} className="theme-menu" role="menu" aria-label="Apariencia y lectura">
    <p className="theme-menu-caption">Elegí cómo ver Viaja</p>
    {choices.map(({value,label,Icon})=><button type="button" role="menuitemradio" aria-checked={preference===value} key={value} onClick={()=>{setPreference(value);setOpen(false);trigger.current?.focus()}}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span>{preference===value&&<Check size={16} aria-hidden="true"/>}
    </button>)}
    <div className="theme-menu-divider" role="separator"/>
    <button type="button" role="menuitemcheckbox" aria-checked={comfort==='on'} onClick={toggleComfort}>
     <BookOpen size={18} aria-hidden="true"/><span>Lectura cómoda</span>{comfort==='on'&&<Check size={16} aria-hidden="true"/>}
    </button>
    <p className="theme-menu-hint">Texto más grande y botones fáciles de tocar.</p>
  </div>}
 </div>;
}
