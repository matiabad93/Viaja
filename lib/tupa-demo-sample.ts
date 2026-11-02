import type {Plan,Trip} from './travel';
import {newId} from './travel';
const iso=(date:Date)=>date.toLocaleDateString('sv-SE');
const exampleDay=(offset:number)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+((5-d.getDay()+7)%7||7)+offset);return iso(d)};
export function tupaSampleTrip():Plan{
 const trip:Trip={
  destination:'Roma, Italia',additionalDestinations:[],origin:'Buenos Aires, Argentina',
  start:exampleDay(0),end:exampleDay(2),travelers:2,budget:0,pace:'Equilibrado',
  transport:'Sin coche',notes:'Viaje de ejemplo para probar la plataforma. No es un paquete de la agencia ni contiene reservas confirmadas.',
  links:'',adjustment:'',sources:['official']
 };
 const activity=(title:string,description:string,time:string,duration:string,location:string)=>({
  id:newId(),title,description,time,duration,location,scheduleStatus:'estimated' as const
 });
 return {
  id:newId(),trip,kind:'draft',createdAt:new Date().toISOString(),
  itinerary:[
   {id:newId(),title:'Día 1 · Paseo por el centro histórico',advice:'Recorrido orientativo a pie, desde el Panteón hacia plazas próximas. Confirmá horarios y acceso a monumentos antes de visitar.',activities:[
    activity('Panteón','Conocé este edificio emblemático de la Roma antigua. Verificá la modalidad de acceso antes de entrar.','10:00','60 min','Panteón, Roma'),
    activity('Piazza Navona','Explorá esta plaza monumental, sus fuentes y fachadas. Ideal para un paseo entre calles históricas.','11:30','45 min','Piazza Navona, Roma'),
    activity('Fontana di Trevi','Visitá una de las fuentes más conocidas de la ciudad y explorá el entorno. Puede haber mucha gente.','15:00','35 min','Fontana di Trevi, Roma'),
    activity('Plaza de España','Recorré la plaza y sus alrededores para cerrar el paseo. Ajustá el orden según energía y distancia.','16:15','45 min','Piazza di Spagna, Roma')
   ]},
   {id:newId(),title:'Día 2 · Roma imperial',advice:'Planificá el Foro Romano y el Coliseo en una misma zona. El orden depende de las entradas que consigas y de los horarios oficiales.',activities:[
    activity('Coliseo','Explorá el entorno del anfiteatro y, si conseguís entrada, su interior. Reservá con antelación cuando sea necesario.','09:30','100 min','Coliseo, Roma'),
    activity('Foro Romano','Descubrí ruinas y espacios arqueológicos del centro imperial. Considerá caminar con calzado cómodo.','11:30','90 min','Foro Romano, Roma'),
    activity('Campidoglio','Subí hacia la plaza y observá su arquitectura y vistas urbanas. Es un buen cierre para el recorrido histórico.','15:00','50 min','Piazza del Campidoglio, Roma')
   ]},
   {id:newId(),title:'Día 3 · Barrios y gastronomía',advice:'Ajustá las visitas al horario de regreso: esta jornada es de ejemplo, no corresponde a vuelos ni traslados confirmados.',activities:[
    activity('Trastevere','Caminá por sus plazas y calles históricas. Aprovechá para conocer la atmósfera local y hacer una pausa gastronómica.','10:00','90 min','Trastevere, Roma'),
    activity('Santa Maria in Trastevere','Descubrí el entorno de la basílica y su plaza. Verificá si hay culto o restricciones de acceso.','11:45','35 min','Basilica di Santa Maria in Trastevere, Roma'),
    activity('Paseo junto al Tíber','Disfrutá las vistas del río desde sus puentes, adaptando el trayecto al tiempo disponible.','14:30','50 min','Fiume Tevere, Roma')
   ]}
  ],
  parts:[{text:'EJEMPLO DEMOSTRATIVO: itinerario editable, sin reservas, tarifas ni verificación de horarios en tiempo real.',annotations:[]}],
  sources:[]
 };
}
