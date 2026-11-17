'use client';
import type {ReactNode} from 'react';
import {AlertCircle,LoaderCircle,MapPin} from 'lucide-react';

type StateKind='loading'|'empty'|'error';
type Props={
 kind:StateKind;title:string;description:string;
 action?:{label:string;onClick:()=>void};children?:ReactNode;
 compact?:boolean;
};
/** Estado reutilizable, anunciado a tecnologías de asistencia sin tapar la navegación. */
export function FeedbackState({kind,title,description,action,children,compact=false}:Props){
 const Icon=kind==='loading'?LoaderCircle:kind==='error'?AlertCircle:MapPin;
 return <div className={'experience-state experience-state-'+kind+(compact?' is-compact':'')}
  role={kind==='error'?'alert':'status'} aria-busy={kind==='loading'}>
  <span className="experience-state-icon" aria-hidden="true"><Icon size={26} className={kind==='loading'?'spin':undefined}/></span>
  <div className="experience-state-copy">
   <h2>{title}</h2><p>{description}</p>{children}
   {action&&<button type="button" className={kind==='empty'?'primary':'secondary'} onClick={action.onClick}>{action.label}</button>}
  </div>
 </div>;
}
