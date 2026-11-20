import {Coffee,Footprints,MapPin,UtensilsCrossed} from 'lucide-react';
import type {ActivityKind} from '../lib/travel';

const tags:Record<ActivityKind,{label:string;Icon:typeof MapPin}>={
 visit:{label:'Visita',Icon:MapPin},
 transfer:{label:'Traslado',Icon:Footprints},
 meal:{label:'Comida',Icon:UtensilsCrossed},
 break:{label:'Pausa',Icon:Coffee}
};

export function ActivityKindTag({kind}:{kind:ActivityKind}){
 const {label,Icon}=tags[kind];
 return <span className={'agenda-kind-tag agenda-kind-tag--'+kind}><Icon size={14} aria-hidden="true"/>{label}</span>;
}
