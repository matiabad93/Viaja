import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
// @ts-ignore Node's native TypeScript runner
import {buildTripPdf} from '../lib/trip-pdf.ts';
import type {Plan} from '../lib/travel.ts';

const trip:Plan={
 id:'pdf-regression',
 kind:'researched',
 createdAt:'2026-11-20T10:00:00Z',
 trip:{
  destination:'Alsacia, Francia',additionalDestinations:['Estrasburgo','Colmar'],
  origin:'Barcelona, España',start:'2026-11-27',end:'2026-11-30',
  travelers:2,budget:480,pace:'Tranquilo',transport:'Tren y autobús',
  notes:'Un recorrido romántico por los mercados navideños sin alquilar automóvil. Priorizar las conexiones por tren.',
  links:'https://www.sncf-connect.com/',adjustment:'',sources:[]
 },
 itinerary:[
  {id:'day1',title:'Llegada a Mulhouse y paseo nocturno',advice:'Hagan el check-in antes de recorrer las plazas. Reserven tiempo para cenar tranquilos.',activities:[
   {id:'d1a',title:'Mercado navideño de Mulhouse',description:'Pasear por el centro histórico y explorar los puestos de artesanías.',time:'21:00',duration:'60 min',location:'Place de la Réunion, Mulhouse'},
   {id:'d1b',title:'Traslado hasta Mulhouse',description:'Viajar desde el aeropuerto utilizando transporte público y confirmar los horarios actuales.',time:'18:45',duration:'90 min',location:'Mulhouse'},
  ]},
  {id:'day2',title:'Estrasburgo y sus mercados de Navidad',advice:'Agrupen las visitas a pie por barrios para evitar idas y vueltas. El paseo al gran árbol conviene hacerlo al anochecer.',activities:[
   {id:'d2a',title:'Tren Mulhouse - Estrasburgo',description:'Tomar el tren regional hacia Estrasburgo. Confirmar horarios y billetes con la compañía.',time:'08:45',duration:'55 min',location:'Gare de Mulhouse'},
   {id:'d2b',title:'Catedral Notre-Dame',description:'Visitar la catedral y recorrer las calles cercanas de la Grande Île con tiempo para fotografías.',time:'10:00',duration:'90 min',location:'Place de la Cathédrale'},
   {id:'d2c',title:'Mercado de la Petite France',description:'Explorar las casas entramadas y los canales; almorzar por la zona.',time:'13:30',duration:'120 min',location:'La Petite France'},
   {id:'d2d',title:'Árbol de Place Kléber',description:'Ver las luces navideñas, comprar recuerdos y disfrutar del ambiente.',time:'17:00',duration:'45 min',location:'Place Kléber'},
   {id:'d2e',title:'Regreso a Mulhouse',description:'Tomar un servicio de regreso sin apurar la visita.',time:'19:00',duration:'60 min',location:'Strasbourg Gare'},
  ]},
  {id:'day3',title:'Colmar, Eguisheim y pueblos de cuento',advice:'Comprobar antes los horarios de las lanzaderas navideñas, que pueden variar entre semana y fines de semana.',activities:[
   {id:'d3a',title:'Recorrido por la Pequeña Venecia',description:'Caminar por los canales y fotografiar las casas tradicionales.',time:'10:00',duration:'90 min',location:'Colmar'},
   {id:'d3b',title:'Pausa para almorzar',description:'Probar alguna especialidad local y dejar tiempo para descansar.',time:'12:00',duration:'70 min',location:'Colmar'},
   {id:'d3c',title:'Excursión a Eguisheim',description:'Tomar una lanzadera y pasear por el centro amurallado.',time:'14:00',duration:'150 min',location:'Eguisheim'},
   {id:'d3d',title:'Cena en mercado navideño',description:'Regresar con margen, buscar un puesto y cenar sin correr.',time:'19:00',duration:'60 min',location:'Colmar'},
  ]},
  {id:'day4',title:'Regreso temprano',advice:'Dejar los billetes y documentos preparados la noche anterior.',activities:[
   {id:'d4a',title:'Traslado al aeropuerto',description:'Verificar el primer servicio disponible y el margen necesario para embarcar.',time:'03:30',duration:'90 min',location:'Mulhouse'},
  ]},
 ],
 expenses:[{id:'e1',date:'2026-11-27',label:'Hotel Mulhouse',category:'Alojamiento',amount:213},{id:'e2',date:'2026-11-28',label:'Billetes de tren',category:'Transporte',amount:48}],
 logistics:{
  accommodations:[{id:'hotel',name:'Hotel centro de Mulhouse',kind:'hotel',address:'Mulhouse, Francia',checkIn:'2026-11-27',checkOut:'2026-11-30',status:'confirmed'}],
  transports:[{id:'flight',kind:'flight',origin:'Barcelona',destination:'Basilea',departureAt:'2026-11-27T16:00:00',arrivalAt:'2026-11-27T18:30:00',departureTimezone:'Europe/Madrid',arrivalTimezone:'Europe/Zurich',status:'planned'}]
 },
 sources:[{title:'SNCF Connect',url:'https://www.sncf-connect.com/'},{title:'Visit Alsace',url:'https://www.visit.alsace/'}],
 parts:[{text:'Las rutas se proponen como inspiración para viajar sin automóvil. Se deben confirmar conexiones y aperturas antes de viajar.',annotations:[]}]
};

const base=Buffer.from(buildTripPdf(trip)).toString('latin1');
assert.match(base,/^%PDF-1\.4/);
assert.ok(base.indexOf('Traslado hasta Mulhouse')<base.indexOf('Mercado navide'));
assert.ok(base.includes('APROVECHAR ESTE D'));
assert.ok(base.includes('Hotel centro de Mulhouse'));
assert.ok(base.includes('SNCF Connect'));
assert.ok(base.includes('Gastos y presupuesto'));
const xref=Number(base.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
assert.equal(base.slice(xref,xref+4),'xref');
const image=readFileSync(new URL('../public/demo/colmar.jpg',import.meta.url));
const withImage=buildTripPdf(trip,{jpeg:new Uint8Array(image),width:1280,height:854});
assert.ok(Buffer.from(withImage).toString('latin1').includes('/Subtype /Image'));
assert.ok(withImage.length>image.length);
if(process.env.VIAJA_PDF_PREVIEW_DIR){
 mkdirSync(process.env.VIAJA_PDF_PREVIEW_DIR,{recursive:true});
 writeFileSync(process.env.VIAJA_PDF_PREVIEW_DIR+'/viaja-preview.pdf',withImage);
 writeFileSync(process.env.VIAJA_PDF_PREVIEW_DIR+'/viaja-preview-no-photo.pdf',buildTripPdf(trip));
}
console.log('Premium PDF: chronological itinerary, advice, logistics, expenses, photo and xref passed');
