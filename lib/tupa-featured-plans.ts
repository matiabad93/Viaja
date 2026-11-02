import {newId,type Plan,type Trip,type Activity,type Day} from './travel.ts';
const date=(offset:number)=>{const d=new Date();d.setHours(12,0,0,0);const untilFriday=(5-d.getDay()+7)%7||7;d.setDate(d.getDate()+untilFriday+offset);return d.toLocaleDateString('sv-SE')};
const place=(title:string,location:string,time:string,duration:string,description:string):Activity=>({
 id:newId(),title,location,time,duration,description,scheduleStatus:'estimated'
});
type Editorial='colmar'|'santorini';
export function tupaEditorialTrip(kind:Editorial):Plan{
 const alsace=kind==='colmar';
 const destination=alsace?'Colmar, Francia':'Santorini, Grecia';
 const day=(title:string,advice:string,activities:Activity[]):Day=>({id:newId(),title,advice,activities});
 const trip:Trip={destination,additionalDestinations:alsace?['Estrasburgo, Francia']:[],origin:'',
  start:date(0),end:date(2),travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',
  notes:'Ruta de inspiración editorial de Tupã Travel. Completá tus propias fechas, alojamiento, vuelos y reservas. Los horarios son sugeridos, no verificados.',links:'',adjustment:'',sources:['official']};
 const itinerary:Day[]=alsace?[
  day('Día 1 · Colmar de cuento','Recorré el casco antiguo a pie, sin necesidad de vehículo. Ajustá los mercados y las visitas a las fechas reales de apertura.',[
   place('La Petite Venise','Colmar','10:00','60 min','Paseá junto a los canales y observá las casas de entramado de madera y sus fachadas tradicionales.'),
   place('Quartier des Tanneurs','Colmar','11:30','45 min','Descubrí el antiguo barrio de los curtidores y su arquitectura característica.'),
   place('Place de l’Ancienne Douane','Colmar','14:00','55 min','Conocé una de las plazas históricas de la ciudad y las calles comerciales que la rodean.'),
   place('Koïfhus y centro histórico','Colmar','15:30','45 min','Explorá el entorno de la antigua aduana y sus fachadas patrimoniales.')
  ]),
  day('Día 2 · Estrasburgo','Elegí un tren entre Colmar y Estrasburgo según los horarios oficiales. Agrupá la catedral y Petite France para reducir traslados.',[
   place('Catedral de Notre-Dame','Estrasburgo','10:00','75 min','Observá la extraordinaria fachada gótica y, si está permitido, conocé el interior de la catedral.'),
   place('Rue Mercière','Estrasburgo','11:45','35 min','Disfrutá la calle histórica que conduce a la catedral y sus vistas arquitectónicas.'),
   place('La Petite France','Estrasburgo','14:00','90 min','Recorré los canales, puentes y casas tradicionales de este barrio famoso de la ciudad.'),
   place('Ponts Couverts','Estrasburgo','16:00','40 min','Contemplá la silueta de las torres medievales y el paisaje urbano junto al agua.')
  ]),
  day('Día 3 · Rincones de Alsacia','Considerá Eguisheim u otro pueblo cercano según transporte y tiempo disponible; las lanzaderas navideñas solo funcionan en fechas determinadas.',[
   place('Eguisheim','Eguisheim','10:00','90 min','Paseá por las calles circulares del pueblo y sus casas de entramado de madera.'),
   place('Plazas y rincones históricos','Eguisheim','12:00','45 min','Explorá tranquilamente las pequeñas plazas y tiendas tradicionales del centro.'),
   place('Regreso y paseo final','Colmar','16:00','60 min','Reservá un margen amplio para volver, recoger equipaje o dirigirte a tu siguiente alojamiento.')
  ])
 ]:[
  day('Día 1 · Caldera y pueblos blancos','Caminar por Fira y Firostefani permite una primera orientación. Revisá la intensidad del sol y las pendientes.',[
   place('Paseo panorámico por Fira','Fira, Santorini','09:30','80 min','Descubrí la arquitectura blanca y las terrazas con vistas a la caldera.'),
   place('Firostefani y miradores','Firostefani, Santorini','12:00','75 min','Recorré los senderos y miradores sobre el mar Egeo, con tiempo para fotografías.'),
   place('Puesta de sol sobre la caldera','Santorini','18:00','60 min','Elegí un mirador adecuado; el horario real de puesta de sol depende de la temporada.')
  ]),
  day('Día 2 · Oia y sus cúpulas','Los traslados entre pueblos dependen de la temporada; confirmá buses u otras opciones autorizadas.',[
   place('Centro histórico de Oia','Oia, Santorini','10:00','90 min','Conocé sus callejuelas, escalinatas y arquitectura cicládica.'),
   place('Miradores de cúpulas azules','Oia, Santorini','12:00','70 min','Buscá las perspectivas públicas más conocidas del paisaje urbano de Oia.'),
   place('Atardecer en Oia','Oia, Santorini','18:00','75 min','Llegá con margen para evitar las horas de mayor afluencia y encontrar un buen lugar.')
  ]),
  day('Día 3 · Playas y patrimonio','Escogé actividades compatibles con tus horarios de llegada o regreso; no se incluyen entradas ni reservas.',[
   place('Akrotiri (exteriores y entorno)','Akrotiri, Santorini','10:00','75 min','Conocé el entorno de uno de los lugares arqueológicos más conocidos de la isla; consultá acceso y entradas.'),
   place('Playa Roja, miradores','Akrotiri, Santorini','12:00','50 min','Contemplá la costa volcánica desde puntos de observación seguros y autorizados.'),
   place('Pueblo de Pyrgos','Pyrgos, Santorini','15:00','90 min','Explorá un pueblo tradicional con vistas elevadas y calles tranquilas.')
  ])
 ];
 return {id:newId(),trip,kind:'draft',createdAt:new Date().toISOString(),itinerary,expenses:[],
  parts:[{text:'Ruta editorial de inspiración. No contiene reservas ni precios vigentes. Verificá horarios, accesibilidad, transportes y aperturas antes del viaje.',annotations:[]}],sources:[]};
}
