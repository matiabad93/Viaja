import type {Activity,ActivityKind} from './travel.ts';

const fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const validActivityKind=(value:unknown):value is ActivityKind=>['visit','transfer','meal','break'].includes(String(value));

/** Older saved trips have no kind. Infer a sensible display category without rewriting their data. */
export function activityKind(activity:Activity):ActivityKind{
 if(validActivityKind(activity.kind))return activity.kind;
 const title=fold(activity.title);
 if(/^(descanso|pausa(?! para (comer|almorzar|cenar))|tiempo libre|siesta|check.?in|check.?out|regreso al hotel|vuelta al hotel|descansar|alojamiento)\b/.test(title))return 'break';
 if(/^(desayuno|almuerzo|comida( en| familiar| tipica)?\b|merienda|cena|brunch|aperitivo|tapas (en|por)|pausa para (comer|almorzar|cenar)|refrigerio|cafe y|picnic)\b/.test(title))return 'meal';
 if(/^(traslado|trayecto|transporte|tren|train|tgv|ter\b|metro|subte|autobus|autocar|bus\b|colectivo|tranvia|taxi|uber|ferry|vuelo|avion|aeropuerto|caminata (a|hasta|hacia)|caminar (a|hasta|hacia)|viaje (a|en)|conexion (a|en)|ida (a|hasta)|desplazamiento)\b/.test(title))return 'transfer';
 if(activity.costCategory==='Transporte')return 'transfer';
 if(activity.costCategory==='Comida')return 'meal';
 return 'visit';
}

export const activityKindLabel:Record<ActivityKind,string>={visit:'Visita',transfer:'Traslado',meal:'Comida',break:'Pausa'};

function durationMinutes(activity:Activity):number{
 const value=fold(activity.duration||'').replace(',','.');
 const hours=/(\d+(?:\.\d+)?)\s*(?:h(?:oras?)?\b|horas?\b)/.exec(value);
 const minutes=/(\d+)\s*(?:min(?:utos?)?\b|m\b)/.exec(value);
 if(hours||minutes)return Math.round(Number(hours?.[1]||0)*60+Number(minutes?.[1]||0));
 return 0;
}

export function agendaSummary(activities:Activity[]){
 const counts:Record<ActivityKind,number>={visit:0,transfer:0,meal:0,break:0};
 let sightseeingMinutes=0,transferMinutes=0;
 for(const activity of activities){
  const kind=activityKind(activity);
  counts[kind]++;
  if(kind==='visit')sightseeingMinutes+=durationMinutes(activity)||60;
  if(kind==='transfer')transferMinutes+=durationMinutes(activity)||30;
 }
 const pace=counts.visit<=1&&counts.transfer>0?'En tránsito':
  counts.visit>=7||sightseeingMinutes>360?'Intenso':
  counts.visit>=4||sightseeingMinutes>210?'Equilibrado':'Tranquilo';
 return {...counts,sightseeingMinutes,transferMinutes,pace,total:activities.length};
}
