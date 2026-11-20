type CharacterCounterProps={
 id:string;
 value:string;
 max:number;
};

/** Keep the count aligned with the browser's native maxLength (UTF-16 units). */
export function CharacterCounter({id,value,max}:CharacterCounterProps){
 const count=value.length;
 const remaining=Math.max(0,max-count);
 const full=count>=max;
 const close=count>=max*.9;
 return <div id={id} className={'character-counter'+(full?' character-counter-full':close?' character-counter-near':'')}>
  <span>{count.toLocaleString('es-ES')} / {max.toLocaleString('es-ES')} caracteres</span>
  <span>{full?'Llegaste al límite':remaining.toLocaleString('es-ES')+' disponibles'}</span>
 </div>;
}
