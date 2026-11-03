'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,Monitor, Moon,Sun} from 'lucide-react';
import {useTheme} from './theme-provider';
import type {ThemePreference} from '../../lib/theme-preference';

const choices=[
 {value:'light' as const,label:'Claro',Icon:Sun},
 {value:'dark' as const,label:'Oscuro',Icon:Moon},
 {value:'system' as const,label:'Sistema',Icon:Monitor}
];

export function ThemeSwitcher(){
 const {preference,resolved,setPreference}=useTheme();
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const handleOutside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false);};
  const handleKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}
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
  {open&&<div className="theme-menu" role="menu" aria-label="Apariencia">
    <p className="theme-menu-caption">Elegí cómo ver Viaja</p>
    {choices.map(({value,label,Icon})=><button type="button" role="menuitemradio" aria-checked={preference===value} key={value} onClick={()=>{setPreference(value);setOpen(false);trigger.current?.focus()}}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span>{preference===value&&<Check size={16} aria-hidden="true"/>}
    </button>)}
  </div>}
 </div>;
}
