'use client';
import {Heart} from 'lucide-react';
export function FavoriteButton({active,onToggle,label,compact=false}:{active:boolean;onToggle:()=>void;label:string;compact?:boolean}){
 return <button type="button" className={'favorite-button'+(active?' is-active':'')+(compact?' is-compact':'')} aria-label={(active?'Quitar de favoritos: ':'Guardar en favoritos: ')+label} aria-pressed={active} title={active?'Quitar de favoritos':'Guardar en favoritos'} onClick={onToggle}>
  <Heart size={20} strokeWidth={1.9} fill={active?'currentColor':'none'} aria-hidden="true"/>
  {!compact&&<span>{active?'Guardada':'Guardar guía'}</span>}
 </button>;
}
