/** Viaja's guided-planner preferences are structured user input, not AI prompt text. */
export const interestOptions=[
 {id:'history',label:'Historia y monumentos'},
 {id:'food',label:'Gastronomía'},
 {id:'nature',label:'Naturaleza'},
 {id:'culture',label:'Arte y cultura'},
 {id:'relax',label:'Descanso'},
 {id:'nightlife',label:'Vida nocturna'},
 {id:'shopping',label:'Compras'},
 {id:'adventure',label:'Aventura'}
] as const;
export type InterestKey=(typeof interestOptions)[number]['id'];
export type InterestLevels=Record<InterestKey,0|1|2|3>;
export type TravelWith='Solo'|'Pareja'|'Familia'|'Amigos';
export type BudgetStyle='Económico'|'Intermedio'|'Cómodo';
export type DayTimeWindow={start:string;end:string};
export type TravelPreferences={
 durationDays:number;
 travelWith:TravelWith;
 budgetStyle:BudgetStyle;
 interests:InterestLevels;
 dayTimes?:DayTimeWindow[];
};
export const defaultTravelPreferences=():TravelPreferences=>({
 durationDays:3,travelWith:'Pareja',budgetStyle:'Intermedio',
 interests:{history:2,food:2,nature:2,culture:2,relax:2,nightlife:1,shopping:1,adventure:1}
});
export const romaExamplePreferences=():TravelPreferences=>({
 ...defaultTravelPreferences(),
 durationDays:3,travelWith:'Pareja',budgetStyle:'Intermedio',
 interests:{history:3,food:3,nature:3,culture:1,relax:1,nightlife:0,shopping:0,adventure:0}
});
const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function validateTravelPreferences(raw:unknown):TravelPreferences|undefined{
 if(raw==null)return undefined;
 if(typeof raw!=='object'||Array.isArray(raw))throw Error('Revisá tus preferencias de viaje.');
 const p=raw as Record<string,unknown>;
 const companions=['Solo','Pareja','Familia','Amigos'];
 const budgets=['Económico','Intermedio','Cómodo'];
 if(!companions.includes(String(p.travelWith))||!budgets.includes(String(p.budgetStyle)))throw Error('Elegí un tipo de viaje y presupuesto válido.');
 if(!Number.isInteger(Number(p.durationDays))||Number(p.durationDays)<1||Number(p.durationDays)>31)throw Error('Elegí entre 1 y 31 días.');
 const interests=p.interests;
 if(!interests||typeof interests!=='object'||Array.isArray(interests))throw Error('Revisá los intereses del viaje.');
 const rawInterests=interests as Record<string,unknown>;
 const clean=Object.fromEntries(interestOptions.map(item=>{
  const level=rawInterests[item.id];
  if(!Number.isInteger(Number(level))||Number(level)<0||Number(level)>3)throw Error('Revisá los intereses del viaje.');
  return [item.id,level];
 })) as InterestLevels;
 if(p.dayTimes!==undefined){
  if(!Array.isArray(p.dayTimes)||p.dayTimes.length>31)throw Error('Hay demasiados horarios por día.');
  const times=p.dayTimes.map((window:unknown)=>{
   if(!window||typeof window!=='object'||Array.isArray(window))throw Error('Revisá los horarios.');
   const w=window as Record<string,unknown>;
   if(typeof w.start!=='string'||typeof w.end!=='string'||!time.test(w.start)||!time.test(w.end)||w.start>=w.end)
    throw Error('El fin de cada jornada debe ser posterior al inicio.');
   return {start:w.start,end:w.end};
  });
  return {durationDays:Number(p.durationDays),travelWith:p.travelWith as TravelWith,budgetStyle:p.budgetStyle as BudgetStyle,interests:clean,dayTimes:times};
 }
 return {durationDays:Number(p.durationDays),travelWith:p.travelWith as TravelWith,budgetStyle:p.budgetStyle as BudgetStyle,interests:clean};
}
export function describeTravelPreferences(preferences:TravelPreferences|undefined):string{
 if(!preferences)return '';
 const preferencesText=interestOptions.map(item=>item.label+': '+preferences.interests[item.id]+'/3').join('; ');
 const times=preferences.dayTimes?.length?'. Franjas disponibles por día: '+preferences.dayTimes.map((w,i)=>'día '+(i+1)+' '+w.start+'–'+w.end).join('; '):'';
 return 'Preferencias declaradas por la persona: viaja '+preferences.travelWith.toLowerCase()+
  '; estilo de gasto '+preferences.budgetStyle.toLowerCase()+
  ' (categoría cualitativa: NO presupone una cantidad de euros). Intereses '+preferencesText+
  '. Los intereses con 0/3 no deben priorizarse; los de 3/3 sí, sin sacrificar coherencia geográfica o seguridad'+times+
  '. Estas preferencias guían sugerencias y NO son instrucciones para reservar ni inventar horarios.';
}
