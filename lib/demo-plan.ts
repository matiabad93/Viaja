import {newId,type Plan,type Trip} from './travel';
/** Editorial demonstration. Times and durations are planning suggestions, not verified opening hours. */
export function parisDemo(base:Trip):Plan {
 const visits=[
  [['09:00','90','Torre Eiffel','Torre Eiffel, París'],['11:00','60','Trocadéro','Place du Trocadéro, París'],['14:00','60','Paseo por el Sena','Port de la Bourdonnais, París']],
  [['09:00','120','Museo del Louvre','Musée du Louvre, París'],['11:30','60','Jardines de las Tullerías','Jardin des Tuileries, París'],['14:00','90','Île de la Cité','Île de la Cité, París']],
  [['09:00','90','Montmartre','Place du Tertre, París'],['11:00','45','Sacré-Cœur','Basilique du Sacré-Cœur, París'],['15:00','60','Jardines de Luxemburgo','Jardin du Luxembourg, París']],
  [['09:00','60','Arco del Triunfo','Arc de Triomphe, París'],['10:30','60','Campos Elíseos','Avenue des Champs-Élysées, París'],['14:00','120','Museo de Orsay','Musée d’Orsay, París']]
 ];
 return {id:newId(),kind:'draft',createdAt:new Date().toISOString(),trip:{...base,destination:'París, Francia',start:'2026-11-10',end:'2026-11-13',notes:'DEMOSTRACIÓN EDITORIAL. Horarios y duraciones propuestos; comprobar aperturas, entradas y traslados antes de viajar.'},itinerary:visits.map((v,i)=>({id:newId(),title:'Día '+(i+1),activities:v.map(([time,duration,title,location])=>({id:newId(),title,time,duration:duration+' min',location,description:'Visita propuesta para recorrer París a tu ritmo. Horario y duración orientativos; verificá condiciones de acceso y reserva en la web oficial.',completed:false}))})),parts:[{text:'Contenido de demostración, no generado por IA. Los horarios son sugerencias de planificación y no confirman la apertura de los lugares para estas fechas. Podés editar cada actividad y adaptar el viaje.',annotations:[]}],sources:[{url:'https://parisjetaime.com/',title:'Oficina de turismo de París'}]};
}
