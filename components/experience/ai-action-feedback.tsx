'use client';

import {AlertCircle,ArrowUpRight,ShieldCheck} from 'lucide-react';

type Props={
 message:string;
 refining?:boolean;
 onAdjust?:()=>void;
};

const schedulePrefix='No aplicamos los cambios porque existen horarios incompatibles:';

/** One contextual, actionable result for a failed AI generation or refinement. */
export function AIActionFeedback({message,refining=false,onAdjust}:Props){
 if(!message)return null;
 const scheduleConflict=message.startsWith(schedulePrefix);
 const detail=(scheduleConflict?message.slice(schedulePrefix.length):message)
  .replace(/\s*Tu viaje anterior sigue intacto\.\s*$/i,'')
  .replace(/\.{2,}/g,'.').trim();

 return <div id="planner-ai-feedback" className="ai-action-feedback" role="alert" tabIndex={-1}>
  <div className="ai-action-feedback-heading"><AlertCircle size={19} aria-hidden="true"/>
   <strong>{scheduleConflict?'Hay un conflicto de horarios':refining?'No pudimos aplicar esta mejora':'No pudimos generar el itinerario'}</strong>
  </div>
  <p>{detail}</p>
  {scheduleConflict&&<p className="ai-action-feedback-hint">Probá pedir que reorganice o sustituya actividades flexibles para hacer espacio. Si hay una reserva u horario fijo, indicá que debe conservarlo.</p>}
  {refining&&<p className="ai-action-feedback-safe"><ShieldCheck size={16} aria-hidden="true"/>Tu viaje anterior sigue intacto.</p>}
  {onAdjust&&<button type="button" className="ai-action-feedback-action" onClick={onAdjust}>
   Editar mi pedido <ArrowUpRight size={16} aria-hidden="true"/>
  </button>}
 </div>;
}
